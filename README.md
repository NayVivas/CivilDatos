# CivilDatos — Cómputos métricos desde planos PDF

Sistema de análisis estructural: el **backend** (`back/`, Python + FastAPI) extrae fundaciones de planos PDF con PyMuPDF, calcula hormigón / acero / encofrado y expone los resultados por API. El **frontend** (`frontend/`, React + Vite) sube el plano y visualiza métricas y tablas.

## Colaboradores

* Pablo
* Naylu
* Irene
* Maximialino
* Alejandro
* Fede

## Estructura del proyecto

```text
CivilDatos/
├── back/
│   ├── main.py              # Servidor FastAPI (puerto 8000)
│   ├── app.py               # Orquestador procesar_fundaciones()
│   ├── config.py            # Rutas y parámetros (BASE_DIR = raíz)
│   ├── procesamiento_pdf.py # Lectura del PDF vía pymupdf
│   ├── fundaciones.py       # Referencias, cuadro, volúmenes (Decimal)
│   ├── armaduras.py         # Barras, peso y compra de acero (Decimal)
│   ├── encofrado.py         # Superficie lateral de zapatas (Decimal)
│   ├── columnas.py          # Detección y asociación de columnas
│   ├── pedestales.py        # Fórmulas geométricas de pedestales
│   ├── hormigon.py          # (reservado)
│   └── reportes.py          # Exportación JSON y CSV
├── frontend/                # React + Vite (puerto 5173)
│   └── src/
│       ├── services/api.js
│       ├── features/analisis/PantallaCarga.jsx
│       ├── features/resultados/VistaResultados.jsx
│       └── features/dashboard/VistaDashboard.jsx
├── data/
│   ├── pdf/Fundaciones/     # Planos de entrada
│   ├── png/{job_id}/        # Imágenes por sesión (aisladas por UUID)
│   ├── reportes/{job_id}/   # JSON/CSV por sesión (aislados por UUID)
│   ├── processed/{job_id}/  # Detecciones intermedias por sesión
│   └── cache/               # Temporales de upload (se limpian por request)
├── experimentos/            # Prototipos previos (no usados por la API)
└── requirements.txt
```

## Requisitos

* Python 3.13.x, Windows + PowerShell
* `pip install -r requirements.txt` más `fastapi`, `uvicorn`, `python-multipart` (`pymupdf==1.28.2` ya está en requirements)
* Node 20+ para el frontend (`npm install` en `frontend/`)

## Ejecución

Backend (desde la raíz):

```powershell
uvicorn back.main:app --reload --port 8000
```

Frontend (otra terminal):

```powershell
cd frontend
npm run dev   # http://localhost:5173
```

El CLI clásico sigue disponible: `python back/app.py --planta ... --detalles ...` (requiere `config.py` con `BASE_DIR = parent.parent`).

## API

| Método | Ruta | Qué hace |
|---|---|---|
| POST | `/api/v1/analizar-plano` | Recibe `file` (obligatorio) + `file_detalles` (opcional). Sin `file_detalles` usa `data/pdf/Fundaciones/Fundaciones_2.pdf` como fallback. Devuelve el JSON premium con `url_plano_png` por job |
| GET | `/api/v1/proyectos/historial` | Devuelve `[]` (placeholder para el Dashboard) |
| GET | `/health` | `{"status": "ok"}` |
| GET | `/planos_procesados/{job_id}/fundaciones_detectadas.png` | Imagen generada por el algoritmo para esa sesión |

Respuesta premium (resumen):

```jsonc
{
  "proyecto_id": "PRY-XXXXXXXX",
  "job_id": "<uuid>",
  "nombre_archivo": "Fundaciones_1.pdf",
  "url_plano_png": "http://localhost:8000/planos_procesados/<uuid>/fundaciones_detectadas.png",
  "metricas_globales": {
    "total_referencias": 61,
    "tipos_identificados": 13,
    "volumen_hormigon_total": "194.71975 m3",
    "volumen_hormigon_exact_m3": "194.71975",
    "precision_algoritmo": "98.2%"
  },
  "tabla_fundaciones": [
    { "tipo": "F1", "cantidad": 4, "dimensiones": "1.40 x 1.40 x 0.35", "volUnitario": "0.686000 m3", "volTotal": "2.744000 m3" }
  ]
}
```

Errores: `400` = problema de ingeniería o archivo inválido (ej. cuadro vs planta, PDF corrupto); `422` = contrato (falta el campo `file`). El frontend **no** debe fijar `Content-Type` manualmente: Axios genera el `boundary` solo, y el filename se envía como tercer argumento del `FormData`.

## Decisiones de ingeniería

* **Números:** todo el motor calcula en `Decimal` con `ROUND_CEILING` (nunca subestima barras). El JSON serializa a float en origen (`reportes.py`); la API reenvía el string puro sin re-redondear.
* **Corrección visible:** la errata `F12(2ª aparición)→F13` vive en `config.py:CORRECCIONES_REFERENCIAS_CUADRO`, no escondida en el algoritmo.
* **Aislamiento multiusuario:** cada request crea `data/{png,reportes,processed}/<job_id>/`. Sin esto dos usuarios se pisaban los archivos de nombre fijo.
* **Robustez:** `pymupdf.FileDataError` → 400 estructurado; la limpieza de temporales en el `finally` nunca tapa la respuesta real (fix del `PermissionError WinError 32` en Windows).

## Historial de cambios (sesión de trabajo)

1. **Reorganización:** creada `back/` y movidos los 10 `.py` sueltos; `config.py` corregido a `parent.parent` (`app.py` es el ex-`main_computos`; `main.py` FastAPI no existía y se creó después).
2. **Puente FastAPI:** nuevo `back/main.py` con CORS Vite, estáticos `/planos_procesados`, `POST analizar-plano` (1 archivo) e historial vacío.
3. **Fix 422:** quitado `Content-Type` manual + filename en `FormData` (ambos archivos frontend); endpoint con `file` + `file_detalles` opcional; `ValueError` de ingeniería → 400.
4. **Auditoría E-2-E:** datos reales vía pymupdf (sin hardcodeo salvo corrección F12 documentada); `Decimal` en motor con fugas float solo en borde; `dibujar_asociaciones` solo corre en CLI, no por request.
5. **Multiusuario:** jobs UUID, cantidades sin rodeo float, volumen string puro, `FileDataError` → 400, `finally` anti-`PermissionError`.

## Pendientes conocidos

* Retención/TTL para `data/*/<job_id>/` (crecen sin cota).
* Serializar `Decimal` como string en origen (`reportes.py`) para exactitud total.
* Generar el PNG de asociaciones por request o corregir su mención.
* `hormigon.py` vacío y `pedestales.py` aún fuera del flujo final.

## Importante

No compartir `.venv`; cada integrante crea el suyo. Los planos de prueba van en `data/pdf/Fundaciones/Fundaciones_1.pdf` (planta) y `Fundaciones_2.pdf` (detalles).
