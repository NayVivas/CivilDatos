# Guion Técnico de Defensa — CivilDatos

> Resumen ejecutivo para la defensa ante jurado. Tiempo estimado: 10 minutos
> (2 min por bloque + 2 min de demo en vivo).

---

## 1. El problema que resolvemos (30 segundos)

Los cómputos métricos de fundaciones se hacen a mano sobre planos PDF: conteo de
zapatas, lectura del cuadro de dimensiones, volúmenes de hormigón y peso de
acero. Es lento y propenso a error. CivilDatos convierte un plano en cómputos
trazables en segundos: **PDF → FastAPI → PyMuPDF → motor de cálculo → dashboard
React**.

---

## 2. Arquitectura multiusuario concurrente (2 minutos)

**El riesgo:** el motor escribía artefactos con nombres fijos
(`resumen_general.json`, `fundaciones_detectadas.png`). Con dos usuarios
simultáneos, el segundo sobrescribía los archivos del primero y este leía
métricas ajenas: una *condición de carrera* silenciosa que invalida cualquier
cómputo.

**La solución, de extremo a extremo:**

1. Cada `POST /api/v1/analizar-plano` genera un `job_id = uuid4()` (`back/main.py`).
2. El motor recibe directorios de salida por parámetro
   (`procesar_fundaciones(..., png_dir=..., report_dir=..., processed_dir=...)`
   en `back/app.py`) y escribe solo dentro de
   `data/{png,reportes,processed}/<job_id>/`.
3. La respuesta devuelve una URL dinámica por sesión:
   `/planos_procesados/<job_id>/fundaciones_detectadas.png`, servida por el
   `StaticFiles` de FastAPI sin configuración extra (sirve el árbol completo).
4. Un script de retención (`back/limpiador.py`, con `programar_limpieza()` para
   hilo demonio al arranque o ejecución por tarea programada) elimina los jobs
   de más de 24 h (1 h en modo demo), así el aislamiento no se convierte en
   fuga de disco. Solo borra subdirectorios de job, jamás archivos raíz.

**Frase para el jurado:** *«Demostramos con dos requests consecutivos que cada
uno recibe un UUID distinto, PNGs de 272 KB independientes servidos con HTTP
200 y reportes que no se cruzan.»*

---

## 3. Integridad del cómputo métrico (2 minutos)

**El riesgo:** Python representa `0.1 + 0.2` como `0.30000000000000004` (punto
flotante binario IEEE 754). Acumulado sobre decenas de zapatas, el error
contamina m³ de hormigón y kg de acero: inadmisible en una certificación de
obra.

**La solución:**

* Todo el núcleo matemático (`fundaciones.py`, `armaduras.py`, `encofrado.py`)
  opera con `Decimal` construido desde strings (`Decimal("7.5")`, jamás
  `Decimal(7.5)`), con redondeo `ROUND_CEILING` en la cantidad de barras — el
  sistema nunca *subestima* material.
* La única conversión a `float` ocurre en la serialización JSON de salida
  (`reportes.py`); la API reenvía el string puro sin re-redondear
  (`volumen_hormigon_exact_m3`) y las cantidades usan conversión entera directa
  vía `Decimal`, sin rodeo `int(float(...))`.
* La corrección de la errata del plano (`F12` duplicado → `F13`) no está
  escondida en el código: vive declarada en
  `config.py:CORRECCIONES_REFERENCIAS_CUADRO`, auditable por cualquiera.

**Frase para el jurado:** *«El motor no conoce los floats: convierte dimensión
a `Decimal` en el borde de entrada y solo serializa al salir. El redondeo
siempre es hacia arriba, como exige la compra de acero.»*

---

## 4. Resiliencia ante fallos — edge cases (2 minutos)

Tres casos borde, tres respuestas estructuradas **sin reiniciar Uvicorn**:

| Caso | Qué pasa | Respuesta |
|---|---|---|
| PDF corrupto o no válido | `pymupdf.FileDataError` interceptado en `procesamiento_pdf.py` y en el endpoint | `400 "El archivo no es un PDF válido o está corrupto"` |
| Plano sin encabezado `TIPO` | `localizar_estructura_cuadro()` lo detecta | `400 "No se encontró el encabezado TIPO."` |
| Cuadro vs planta inconsistentes | `validar_referencias()` (faltantes/sobrantes/duplicadas) | `400` con el detalle del descuadre |

**El bug que casi nos voltea la demo:** el `finally` del endpoint borraba los
temporales sin blindaje y, en Windows, el handle rezagado de una apertura
fallida de PyMuPDF lanzaba `PermissionError WinError 32`, que **tapaba** el
`HTTPException(400)` real y el cliente veía un `500` plano. Hoy la limpieza
traga `OSError`: *el error de limpieza jamás enmascara la respuesta de
negocio*. Los `422` quedan reservados exclusivamente a errores de contrato
FasAPI (falta el campo `file`); todo lo de ingeniería es `400`.

**Frase para el jurado:** *«Pueden subirnos un archivo roto en vivo: el hilo
del servidor sigue en pie y el frontend recibe un JSON de error legible, no
una caída.»*

---

## 5. Demo en vivo sugerida (2 minutos)

1. `uvicorn back.main:app --reload --port 8000` + `npm run dev`.
2. Subir `Fundaciones_1.pdf` → mostrar `proyecto_id`, 61 referencias, 13 tipos,
   `194.71975 m³` y la tabla por tipo.
3. Abrir la `url_plano_png` del JSON: imagen con detecciones de *esa* sesión.
4. Subir un archivo corrupto → mostrar el `400` estructurado sin caída.
5. `python back/limpiador.py --dry-run` → mostrar la política de retención.

## 6. Preguntas difíciles anticipadas

* *«¿Por qué dos archivos y no uno?»* — El algoritmo necesita planta (conteo) y
  cuadro de detalles (dimensiones) como fuentes independientes para la
  validación cruzada; el endpoint acepta ambos y usa fallback documentado si
  llega uno solo.
* *«¿Qué pasa con 100 usuarios a la vez?»* — Aislamiento total por job; el
  único recurso compartido es el sistema de archivos, y cada job tiene su
  namespace. La retención evita el crecimiento sin cota.
* *«¿La precisión float del JSON invalida el cálculo?»* — No: el cálculo es
  `Decimal` de punta a punta; el float solo existe en el transporte y se
  expone además el string exacto. Orden de magnitud del desvío: 1e-16 relativo.
