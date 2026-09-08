from decimal import Decimal
from pathlib import Path


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
PDF_DIR = DATA_DIR / "pdf"
PNG_DIR = DATA_DIR / "png"
CACHE_DIR = DATA_DIR / "cache"
REPORT_DIR = DATA_DIR / "reportes"
PROCESSED_DIR = DATA_DIR / "processed"
ANALYSIS_DIR = DATA_DIR / "analysis"

for carpeta in (
    PDF_DIR,
    PNG_DIR,
    CACHE_DIR,
    REPORT_DIR,
    PROCESSED_DIR,
    ANALYSIS_DIR,
):
    carpeta.mkdir(parents=True, exist_ok=True)


# Parámetros técnicos ingresados por el usuario.
RECUBRIMIENTO_FUNDACION_CM = Decimal("7.5")
LONGITUD_DOBLEZ_CM = Decimal("15")
LONGITUD_BARRA_COMERCIAL_M = Decimal("12")
DESPERDICIO_ACERO_PORCENTAJE = Decimal("5")
USAR_ENCOFRADO_ZAPATAS = True

CORRECCIONES_REFERENCIAS_CUADRO = {
    ("F12", 2): "F13",
}
