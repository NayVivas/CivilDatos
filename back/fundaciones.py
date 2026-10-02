import re
import unicodedata
from collections import Counter
from decimal import Decimal, InvalidOperation


PATRON_FUNDACION = re.compile(r"F\d+", re.IGNORECASE)
PATRON_NUMERO = re.compile(r"^\d+(?:[.,]\d+)?$")


def _normalizar_encabezado(texto: str) -> str:
    """Mayúsculas sin tildes para comparar encabezados de otras oficinas."""
    mayusculas = texto.strip().upper()
    return "".join(
        caracter
        for caracter in unicodedata.normalize("NFD", mayusculas)
        if unicodedata.category(caracter) != "Mn"
    )


# Sinónimos aceptados por columna del cuadro (se comparan normalizados,
# por lo que "FUNDACIÓN" y "FUNDACION" valen lo mismo).
SINONIMOS_ENCABEZADOS = {
    "TIPO": ("TIPO", "ZAPATA", "REFERENCIA", "FUNDACION"),
    "H": ("H", "ALTURA", "ESPESOR", "PERALTE"),
}


def detectar_fundaciones(palabras: list[dict]) -> list[dict]:
    detecciones = []
    for palabra in palabras:
        texto = palabra["texto"].strip().upper()
        if not PATRON_FUNDACION.fullmatch(texto):
            continue

        detecciones.append(
            {
                "referencia": texto,
                "pagina": palabra["pagina"],
                "x0": palabra["x0"],
                "y0": palabra["y0"],
                "x1": palabra["x1"],
                "y1": palabra["y1"],
                "centro_x": round((palabra["x0"] + palabra["x1"]) / 2, 2),
                "centro_y": round((palabra["y0"] + palabra["y1"]) / 2, 2),
            }
        )
    return detecciones


def contar_referencias(detecciones: list[dict]) -> Counter:
    return Counter(item["referencia"] for item in detecciones)


def _buscar_palabra_alineada(
    palabras: list[dict],
    texto: str | tuple[str, ...] | list[str],
    encabezado_tipo: dict,
    tolerancia: int = 3,
) -> dict:
    """Busca un encabezado por coincidencia exacta o lista de sinónimos."""
    if isinstance(texto, str):
        candidatos = (texto,)
    else:
        candidatos = tuple(texto)
    esperados = {_normalizar_encabezado(candidato) for candidato in candidatos}
    for palabra in palabras:
        if (
            _normalizar_encabezado(palabra["texto"]) in esperados
            and abs(palabra["x0"] - encabezado_tipo["x0"]) <= tolerancia
        ):
            return palabra
    raise ValueError(
        f"No se encontró el encabezado {'/'.join(candidatos)} del cuadro."
    )


def localizar_estructura_cuadro(palabras: list[dict]) -> dict:
    # 1. Preferir el encabezado exacto TIPO (comportamiento histórico).
    candidatos_tipo = [
        palabra
        for palabra in palabras
        if _normalizar_encabezado(palabra["texto"]) == "TIPO"
    ]
    # 2. Fallback a sinónimos solo si otra oficina usó otro rótulo.
    if not candidatos_tipo:
        sinonimos_tipo = {
            _normalizar_encabezado(sinonimo)
            for sinonimo in SINONIMOS_ENCABEZADOS["TIPO"]
        }
        candidatos_tipo = [
            palabra
            for palabra in palabras
            if _normalizar_encabezado(palabra["texto"]) in sinonimos_tipo
        ]
    if not candidatos_tipo:
        raise ValueError(
            "No se encontró el encabezado TIPO del cuadro "
            "(se aceptan: TIPO/ZAPATA/REFERENCIA/FUNDACIÓN)."
        )

    encabezado_tipo = candidatos_tipo[0]
    encabezados = {
        "TIPO": encabezado_tipo,
        "X": _buscar_palabra_alineada(palabras, "X", encabezado_tipo),
        "Y": _buscar_palabra_alineada(palabras, "Y", encabezado_tipo),
        "H": _buscar_palabra_alineada(
            palabras, SINONIMOS_ENCABEZADOS["H"], encabezado_tipo
        ),
        "ARMADURA": _buscar_palabra_alineada(
            palabras, "ARMADURA", encabezado_tipo
        ),
        "PEDESTAL": _buscar_palabra_alineada(
            palabras, "PEDESTAL", encabezado_tipo
        ),
    }

    referencias = []
    for palabra in palabras:
        texto = palabra["texto"].strip().upper()
        if (
            PATRON_FUNDACION.fullmatch(texto)
            and palabra["x0"] < encabezado_tipo["x0"]
            and abs(palabra["y0"] - encabezado_tipo["y0"]) <= 8
        ):
            referencias.append(palabra)

    referencias.sort(key=lambda palabra: palabra["x0"], reverse=True)
    return {"encabezados": encabezados, "referencias": referencias}


def _buscar_valor_dimension(
    palabras: list[dict], referencia: dict, encabezado: dict
) -> str | None:
    candidatos = []
    for palabra in palabras:
        texto = palabra["texto"].strip()
        if (
            PATRON_NUMERO.fullmatch(texto)
            and abs(palabra["x0"] - referencia["x0"]) <= 3
            and abs(palabra["y0"] - encabezado["y0"]) <= 5
        ):
            candidatos.append(palabra)

    if not candidatos:
        return None

    elegido = min(
        candidatos,
        key=lambda palabra: abs(palabra["x0"] - referencia["x0"])
        + abs(palabra["y0"] - encabezado["y0"]),
    )
    return elegido["texto"]


def extraer_dimensiones_cuadro(
    palabras: list[dict], estructura: dict
) -> list[dict]:
    encabezados = estructura["encabezados"]
    filas = []
    for numero, referencia in enumerate(estructura["referencias"], start=1):
        filas.append(
            {
                "numero_fila": numero,
                "referencia": referencia["texto"].strip().upper(),
                "x": _buscar_valor_dimension(
                    palabras, referencia, encabezados["X"]
                ),
                "y": _buscar_valor_dimension(
                    palabras, referencia, encabezados["Y"]
                ),
                "h": _buscar_valor_dimension(
                    palabras, referencia, encabezados["H"]
                ),
            }
        )
    return filas


def validar_referencias(
    referencias_planta: set[str], filas_cuadro: list[dict]
) -> dict:
    lista = [fila["referencia"].upper() for fila in filas_cuadro]
    conteo = Counter(lista)
    unicas = set(lista)
    return {
        "faltantes": referencias_planta - unicas,
        "sobrantes": unicas - referencias_planta,
        "duplicadas": {
            referencia: cantidad
            for referencia, cantidad in conteo.items()
            if cantidad > 1
        },
    }


def aplicar_correcciones(
    filas: list[dict], correcciones: dict[tuple[str, int], str]
) -> list[dict]:
    apariciones = Counter()
    resultado = []
    for fila in filas:
        original = fila["referencia"].strip().upper()
        apariciones[original] += 1
        corregida = correcciones.get((original, apariciones[original]), original)

        nueva = fila.copy()
        nueva.update(
            {
                "referencia_original": original,
                "referencia": corregida,
                "fue_corregida": corregida != original,
                "motivo_correccion": (
                    f"Aparición {apariciones[original]} de {original} corregida "
                    f"manualmente a {corregida}."
                    if corregida != original
                    else None
                ),
            }
        )
        resultado.append(nueva)
    return resultado


def convertir_dimension(valor: str | None) -> Decimal:
    if valor is None:
        raise ValueError("La dimensión no puede estar vacía.")
    try:
        return Decimal(valor.strip().replace(",", "."))
    except InvalidOperation as error:
        raise ValueError(f"Dimensión inválida: {valor}") from error


def calcular_volumenes(
    filas: list[dict], conteo_planta: Counter
) -> tuple[list[dict], Decimal]:
    computos = []
    for fila in filas:
        referencia = fila["referencia"]
        x = convertir_dimension(fila["x"])
        y = convertir_dimension(fila["y"])
        h = convertir_dimension(fila["h"])
        cantidad = conteo_planta.get(referencia, 0)
        volumen_unitario = x * y * h
        computos.append(
            {
                "referencia": referencia,
                "cantidad": cantidad,
                "x": x,
                "y": y,
                "h": h,
                "volumen_unitario": volumen_unitario,
                "volumen_total": volumen_unitario * cantidad,
            }
        )

    total = sum(
        (computo["volumen_total"] for computo in computos), Decimal("0")
    )
    return computos, total
