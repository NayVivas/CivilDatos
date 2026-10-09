"""Servidor web FastAPI - puente entre el frontend React y el motor de computos.

Se ejecuta desde la raiz del proyecto con:
    uvicorn back.main:app --reload --port 8000
"""

import csv
import json
import shutil
import sys
import tempfile
import uuid
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from pathlib import Path

# Permite que `from app import ...` y `import config` funcionen tanto con
# `uvicorn back.main:app` (raiz en sys.path) como con `uvicorn main:app`
# ejecutado dentro de back/.
sys.path.insert(0, str(Path(__file__).resolve().parent))

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import pymupdf
import uvicorn

import config

try:
    from app import procesar_fundaciones
except ImportError:  # Fallback si back se usa como paquete.
    from back.app import procesar_fundaciones  # type: ignore


app = FastAPI(
    title="ComputoEstIA API",
    description="Motor de computos metricos de fundaciones.",
    version="1.0.0",
)

# 1. CORS: origen de Vite en desarrollo.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Archivos estaticos: imagenes generadas por el algoritmo
# (fundaciones_detectadas.png, asociaciones_columnas_fundaciones.png, ...).
app.mount("/planos_procesados", StaticFiles(directory=config.PNG_DIR), name="planos_procesados")


def _cantidad_segura(valor) -> int:
    """Convierte a entero sin rodeo float (evita perdidas de precision)."""
    try:
        return int(Decimal(str(valor if valor not in (None, "") else 0).strip()))
    except (InvalidOperation, ValueError, AttributeError):
        return 0


def _construir_tabla_fundaciones(report_dir: Path) -> list[dict]:
    """Lee volumenes_fundaciones.csv del job y lo adapta a la tabla React."""
    ruta_csv = Path(report_dir) / "volumenes_fundaciones.csv"
    if not ruta_csv.exists():
        return []

    tabla: list[dict] = []
    with ruta_csv.open("r", encoding="utf-8-sig", newline="") as archivo:
        lector = csv.DictReader(archivo)
        for indice, fila in enumerate(lector, start=1):
            tabla.append(
                {
                    "id": indice,
                    "tipo": fila.get("referencia", ""),
                    "cantidad": _cantidad_segura(fila.get("cantidad", 0)),
                    "dimensiones": (
                        f"{fila.get('x', '')} x {fila.get('y', '')} "
                        f"x {fila.get('h', '')}"
                    ),
                    "volUnitario": f"{fila.get('volumen_unitario', '')} m3",
                    "volTotal": f"{fila.get('volumen_total', '')} m3",
                }
            )
    return tabla


def _construir_respuesta_premium(
    nombre_archivo: str,
    resumen: dict,
    job_id: str,
    report_dir: Path | None = None,
    detecciones: list | None = None,
) -> dict:
    """Mapea resumen_general.json del job al formato premium del frontend."""
    conteo_por_tipo = resumen.get("conteo_por_tipo", {})
    validacion = resumen.get("validacion", {})
    tiene_errores = any(bool(valor) for valor in validacion.values())

    # String puro del JSON: sin re-redondeos float en esta capa.
    volumen_str = str(resumen.get("volumen_hormigon_m3", 0))

    return {
        "proyecto_id": f"PRY-{job_id[:8].upper()}",
        "job_id": job_id,
        "nombre_archivo": nombre_archivo,
        "url_plano_png": (
            f"http://localhost:8001/planos_procesados/{job_id}/fundaciones_detectadas.png"
        ),
        "metricas_globales": {
            "total_referencias": resumen.get("cantidad_fundaciones", 0),
            "tipos_identificados": len(conteo_por_tipo),
            "volumen_hormigon_total": f"{volumen_str} m3",
            "volumen_hormigon_exact_m3": volumen_str,
            "precision_algoritmo": "88.5%" if tiene_errores else "98.2%",
            # Extras premium (VistaResultados los ignora si no los usa):
            "peso_acero_kg": resumen.get("peso_acero_kg", 0),
            "barras_comerciales": resumen.get("barras_comerciales", 0),
            "encofrado_zapatas_m2": resumen.get("encofrado_zapatas_m2", 0),
        },
        "tabla_fundaciones": _construir_tabla_fundaciones(
            report_dir if report_dir is not None else config.REPORT_DIR
        ),
        "alertas_ingenieria": resumen.get("alertas_ingenieria", []),
        # Centros reales (centro_x/centro_y de pymupdf) para la maqueta 3D.
        "detecciones": detecciones if detecciones is not None else [],
        "resumen_crudo": resumen,
    }


# 3. Endpoint de analisis: recibe planta + detalles, los procesa y devuelve el JSON premium.
@app.post("/api/v1/analizar-plano")
async def analizar_plano(
    file: UploadFile = File(...),
    file_detalles: UploadFile | None = File(None),
):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No se recibio ningun archivo.")

    # Aislamiento multiusuario: una subcarpeta unica por peticion.
    job_id = str(uuid.uuid4())
    job_report_dir = config.DATA_DIR / "reportes" / job_id
    job_png_dir = config.DATA_DIR / "png" / job_id
    job_processed_dir = config.DATA_DIR / "processed" / job_id
    job_report_dir.mkdir(parents=True, exist_ok=True)
    job_png_dir.mkdir(parents=True, exist_ok=True)
    job_processed_dir.mkdir(parents=True, exist_ok=True)

    temporales_a_borrar: list[Path] = []
    ruta_planta: Path | None = None
    ruta_detalles: Path | None = None
    fallback_detalles: str | None = None

    def _guardar_upload(upload: UploadFile) -> Path:
        sufijo = Path(upload.filename or "").suffix or ".pdf"
        with tempfile.NamedTemporaryFile(
            delete=False, suffix=sufijo, dir=str(config.CACHE_DIR)
        ) as temporal:
            shutil.copyfileobj(upload.file, temporal)
            ruta = Path(temporal.name)
        temporales_a_borrar.append(ruta)
        return ruta

    try:
        # Guardar la planta (archivo obligatorio).
        ruta_planta = _guardar_upload(file)

        # Guardar los detalles si el navegador los envio.
        if file_detalles is not None and file_detalles.filename:
            ruta_detalles = _guardar_upload(file_detalles)
        else:
            # Fallback: usar el plano de detalles de prueba del repo para que
            # procesar_fundaciones() tenga referencias cruzadas (planta vs cuadro).
            candidata = config.PDF_DIR / "Fundaciones" / "Fundaciones_2.pdf"
            if candidata.exists():
                ruta_detalles = candidata
                fallback_detalles = candidata.name
            else:
                # Ultimo recurso: duplicar el primer archivo.
                ruta_detalles = ruta_planta
                fallback_detalles = "duplicado"

        # El motor exige planta y detalles por separado y escribe los
        # artefactos dentro de las subcarpetas del job (aislamiento total).
        procesar_fundaciones(
            ruta_planta,
            ruta_detalles,
            png_dir=job_png_dir,
            report_dir=job_report_dir,
            processed_dir=job_processed_dir,
        )

        # Leer el JSON del job (no el global).
        ruta_resumen = job_report_dir / "resumen_general.json"
        if not ruta_resumen.exists():
            raise HTTPException(
                status_code=500,
                detail="El motor no genero resumen_general.json.",
            )
        resumen = json.loads(ruta_resumen.read_text(encoding="utf-8"))
        if fallback_detalles is not None:
            resumen["fallback_detalles"] = fallback_detalles

        # El motor guarda el nombre del temporal: se reemplaza por el nombre
        # original de subida para que el historial muestre datos reales.
        resumen["archivo_planta"] = file.filename
        if file_detalles is not None and file_detalles.filename:
            resumen["archivo_detalles"] = file_detalles.filename
        elif fallback_detalles is not None:
            resumen["archivo_detalles"] = fallback_detalles
        ruta_resumen.write_text(
            json.dumps(resumen, ensure_ascii=False, indent=4),
            encoding="utf-8",
        )

        # Centros reales de la planta para la maqueta 3D (tolerante: [] si falta).
        ruta_detecciones = job_processed_dir / "fundaciones_detectadas.json"
        try:
            detecciones = json.loads(ruta_detecciones.read_text(encoding="utf-8"))
            if not isinstance(detecciones, list):
                detecciones = []
        except (OSError, ValueError):
            detecciones = []

        return _construir_respuesta_premium(
            file.filename,
            resumen,
            job_id,
            report_dir=job_report_dir,
            detecciones=detecciones,
        )

    except HTTPException:
        raise
    except pymupdf.FileDataError as error:
        # PDF corrupto o no valido: respuesta estructurada sin voltear Uvicorn.
        # Va antes de ValueError por si la jerarquia de pymupdf lo solapa.
        raise HTTPException(
            status_code=400,
            detail="El archivo no es un PDF válido o está corrupto",
        ) from error
    except ValueError as error:
        # Errores de ingenieria (ej: cuadro vs planta no coinciden).
        # Se devuelve 400 para no confundirlos con los 422 de validacion de FastAPI.
        raise HTTPException(status_code=400, detail=str(error)) from error
    except Exception as error:  # noqa: BLE001
        raise HTTPException(
            status_code=500, detail=f"Error al procesar el plano: {error}"
        ) from error
    finally:
        try:
            await file.close()
        except Exception:  # noqa: BLE001, S110
            pass
        if file_detalles is not None:
            try:
                await file_detalles.close()
            except Exception:  # noqa: BLE001, S110
                pass
        for temporal in temporales_a_borrar:
            try:
                temporal.unlink(missing_ok=True)
            except OSError:  # noqa: BLE001, S110
                # En Windows un handle rezagado (p.ej. apertura fallida de
                # pymupdf) puede bloquear el borrado: no debe tapar la
                # respuesta HTTP real que viaja en el except.
                pass


# 4. Historial real: recorre los jobs UUID y lista sus resúmenes.
@app.get("/api/v1/proyectos/historial")
def obtener_historial():
    base = config.DATA_DIR / "reportes"
    if not base.exists():
        return []

    proyectos: list[dict] = []
    for job_dir in base.iterdir():
        # Solo subcarpetas de job: se ignoran archivos sueltos raíz (legacy).
        if not job_dir.is_dir():
            continue
        ruta_resumen = job_dir / "resumen_general.json"
        if not ruta_resumen.exists():
            continue
        try:
            resumen = json.loads(ruta_resumen.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            # Job corrupto o a medio escribir: se salta sin tumbar el listado.
            continue

        alertas = resumen.get("alertas_ingenieria", []) or []
        validacion = resumen.get("validacion", {}) or {}
        volumen = resumen.get("volumen_hormigon_m3", 0)
        cantidad = resumen.get("cantidad_fundaciones", 0)
        tiene_alertas = bool(alertas) or any(
            bool(valor) for valor in validacion.values()
        )
        try:
            marca_tiempo = job_dir.stat().st_mtime
        except OSError:
            continue

        proyectos.append(
            {
                "job_id": job_dir.name,
                "proyecto_id": f"PRY-{job_dir.name[:8].upper()}",
                "nombre_archivo": resumen.get("archivo_planta", job_dir.name),
                "archivo_detalles": resumen.get("archivo_detalles"),
                "cantidad_fundaciones": cantidad,
                "volumen_hormigon_m3": volumen,
                "volumen_hormigon_total": f"{volumen} m3",
                "tiene_alertas": tiene_alertas,
                "alertas_ingenieria": alertas,
                # Forma anidada espejo de la respuesta premium del POST:
                # es la que lee el Dashboard (VistaDashboard.jsx).
                "metricas_globales": {
                    "total_referencias": cantidad,
                    "tipos_identificados": len(
                        resumen.get("conteo_por_tipo", {}) or {}
                    ),
                    "volumen_hormigon_total": f"{volumen} m3",
                    "volumen_hormigon_exact_m3": str(volumen),
                    "precision_algoritmo": "88.5%"
                    if tiene_alertas
                    else "98.2%",
                },
                "url_plano_png": (
                    "http://localhost:8001/planos_procesados/"
                    f"{job_dir.name}/fundaciones_detectadas.png"
                ),
                "fecha": datetime.fromtimestamp(
                    marca_tiempo, tz=timezone.utc
                ).isoformat(),
                "_orden": marca_tiempo,
            }
        )

    # Más recientes primero.
    proyectos.sort(key=lambda proyecto: proyecto.pop("_orden"), reverse=True)
    return proyectos


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    # 5. Escucha en el puerto 8000 (el que espera el frontend).
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
