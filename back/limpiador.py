"""Limpieza automática de artefactos por job (retención por TTL).

Cada petición al endpoint POST /api/v1/analizar-plano crea una subcarpeta
aislada ``data/{reportes,png,processed}/<job_id>/``. Sin retención, esas
carpetas crecen sin cota. Este script elimina de forma recursiva las
subcarpetas de job cuya fecha de modificación supere el TTL.

Uso manual (tarea programada o consola)::

    python back/limpiador.py                  # TTL default: 24 h
    python back/limpiador.py --ttl-horas 1    # modo demo: 1 h
    python back/limpiador.py --dry-run        # solo informa, no borra

Integración al arranque del servidor (una línea en ``back/main.py``)::

    from limpiador import programar_limpieza
    programar_limpieza(intervalo_horas=1, ttl_horas=24)

Nunca borra archivos sueltos del nivel raíz (p. ej. el legacy
``resumen_general.json``): solo subdirectorios de job.
"""

import argparse
import shutil
import threading
import time
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR / "data"

# Carpetas que contienen subcarpetas por job UUID.
CARPETAS_OBJETIVO = (
    DATA_DIR / "reportes",
    DATA_DIR / "png",
    DATA_DIR / "processed",
)

TTL_HORAS_DEFAULT = 24


def _antiguedad_horas(carpeta: Path) -> float:
    """Horas transcurridas desde la última modificación de la carpeta."""
    return (time.time() - carpeta.stat().st_mtime) / 3600


def limpiar_jobs(
    ttl_horas: float = TTL_HORAS_DEFAULT,
    carpetas: tuple[Path, ...] = CARPETAS_OBJETIVO,
    dry_run: bool = False,
) -> dict:
    """Elimina subcarpetas de job más viejas que ``ttl_horas``.

    Devuelve un resumen ``{"revisadas": int, "eliminadas": [...], "errores": {...}}``.
    """
    resumen: dict = {"revisadas": 0, "eliminadas": [], "errores": {}}

    for base in carpetas:
        if not base.exists():
            continue
        for hija in base.iterdir():
            # Solo subdirectorios de job: jamás archivos del nivel raíz.
            if not hija.is_dir():
                continue
            resumen["revisadas"] += 1
            try:
                if _antiguedad_horas(hija) > ttl_horas:
                    if dry_run:
                        resumen["eliminadas"].append(f"[dry-run] {hija}")
                    else:
                        shutil.rmtree(hija, ignore_errors=False)
                        resumen["eliminadas"].append(str(hija))
            except OSError as error:
                resumen["errores"][str(hija)] = str(error)

    return resumen


def programar_limpieza(
    intervalo_horas: float = 1,
    ttl_horas: float = TTL_HORAS_DEFAULT,
) -> threading.Thread:
    """Lanza un hilo demonio que ejecuta ``limpiar_jobs`` cada intervalo.

    Pensado para llamarse una vez al arrancar el servidor. No bloquea:
    el hilo es ``daemon`` y muere con el proceso Uvicorn.
    """

    def _bucle() -> None:
        while True:
            time.sleep(intervalo_horas * 3600)
            try:
                limpiar_jobs(ttl_horas=ttl_horas)
            except Exception:  # noqa: BLE001
                # La limpieza nunca debe voltear el servidor.
                continue

    hilo = threading.Thread(target=_bucle, name="limpiador-jobs", daemon=True)
    hilo.start()
    return hilo


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Elimina jobs UUID más viejos que el TTL."
    )
    parser.add_argument(
        "--ttl-horas",
        type=float,
        default=TTL_HORAS_DEFAULT,
        help="Antigüedad máxima en horas (default: 24; demo: 1).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Solo informa lo que borraría, sin eliminar.",
    )
    args = parser.parse_args()

    resumen = limpiar_jobs(ttl_horas=args.ttl_horas, dry_run=args.dry_run)
    print(
        f"Revisadas: {resumen['revisadas']} | "
        f"Eliminadas: {len(resumen['eliminadas'])} | "
        f"Errores: {len(resumen['errores'])}"
    )
    for ruta in resumen["eliminadas"]:
        print(f"  - {ruta}")
    for ruta, error in resumen["errores"].items():
        print(f"  ! {ruta}: {error}")
    return 1 if resumen["errores"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
