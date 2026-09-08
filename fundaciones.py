import re
from collections import Counter
from decimal import Decimal, InvalidOperation


PATRON_FUNDACION = re.compile(r"F\d+", re.IGNORECASE)
PATRON_NUMERO = re.compile(r"^\d+(?:[.,]\d+)?$")


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
    palabras: list[dict], texto: str, encabezado_tipo: dict, tolerancia: int = 3
) -> dict:
    for palabra in palabras:
        if (
            palabra["texto"].strip().upper() == texto.upper()
            and abs(palabra["x0"] - encabezado_tipo["x0"]) <= tolerancia
        ):
            return palabra
    raise ValueError(f"No se encontró el encabezado {texto} del cuadro.")


def localizar_estructura_cuadro(palabras: list[dict]) -> dict:
    candidatos_tipo = [
        palabra
        for palabra in palabras
        if palabra["texto"].strip().upper() == "TIPO"
    ]
    if not candidatos_tipo:
        raise ValueError("No se encontró el encabezado TIPO.")

    encabezado_tipo = candidatos_tipo[0]
    encabezados = {
        "TIPO": encabezado_tipo,
        "X": _buscar_palabra_alineada(palabras, "X", encabezado_tipo),
        "Y": _buscar_palabra_alineada(palabras, "Y", encabezado_tipo),
        "H": _buscar_palabra_alineada(palabras, "H", encabezado_tipo),
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
