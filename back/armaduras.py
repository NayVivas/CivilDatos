"""Interpretación y cómputo de las armaduras de las fundaciones."""

from collections import defaultdict
from decimal import Decimal, ROUND_CEILING
import re


PATRON_ARMADURA = re.compile(
    r"(?:As\s*([XY])\s*=\s*)?(\d+)\s*[ØO]\s*"
    r"(\d+\s*/\s*\d+)\s*[\"”]?\s*c\s*/?\s*d\s*"
    r"(\d+(?:[.,]\d+)?)\s*cm",
    re.IGNORECASE,
)


def extraer_textos_armadura(palabras, estructura_cuadro, filas):
    """Une las palabras ubicadas en la columna ARMADURA de cada fila."""
    encabezados = estructura_cuadro["encabezados"]
    referencias = estructura_cuadro["referencias"]
    inicio_columna = encabezados["H"]["y0"] + 10
    fin_columna = encabezados["PEDESTAL"]["y0"] - 10
    resultados = []

    for indice, referencia in enumerate(referencias):
        limite_superior = (
            encabezados["TIPO"]["x0"]
            if indice == 0
            else (referencias[indice - 1]["x0"] + referencia["x0"]) / 2
        )
        limite_inferior = (
            referencia["x0"] - (referencias[indice - 1]["x0"] - referencia["x0"]) / 2
            if indice == len(referencias) - 1
            else (referencia["x0"] + referencias[indice + 1]["x0"]) / 2
        )

        palabras_fila = []
        for palabra in palabras:
            if limite_inferior <= palabra["x0"] < limite_superior and inicio_columna <= palabra["y0"] <= fin_columna:
                palabras_fila.append(palabra)

        palabras_fila.sort(key=lambda dato: (-dato["x0"], dato["y0"]))
        resultados.append(
            {
                "referencia_original": referencia["texto"].strip().upper(),
                "referencia": filas[indice]["referencia"],
                "texto": " ".join(dato["texto"] for dato in palabras_fila).strip(),
                "palabras": palabras_fila,
            }
        )

    return resultados


def separar_niveles_armadura(registros):
    """Separa el texto de cada fundación en malla superior e inferior."""
    resultado = []
    for registro in registros:
        etiqueta_superior = next((p for p in registro["palabras"] if p["texto"].strip().upper() == "SUPERIOR"), None)
        etiqueta_inferior = next((p for p in registro["palabras"] if p["texto"].strip().upper() == "INFERIOR"), None)
        if etiqueta_superior is None or etiqueta_inferior is None:
            raise ValueError(f"No se encontraron SUPERIOR e INFERIOR para {registro['referencia']}.")

        superiores = []
        inferiores = []
        for palabra in registro["palabras"]:
            if palabra["texto"].strip().upper() in {"SUPERIOR", "INFERIOR"}:
                continue
            destino = superiores if abs(palabra["x0"] - etiqueta_superior["x0"]) < abs(palabra["x0"] - etiqueta_inferior["x0"]) else inferiores
            destino.append(palabra)
        superiores.sort(key=lambda dato: (-dato["x0"], dato["y0"]))
        inferiores.sort(key=lambda dato: (-dato["x0"], dato["y0"]))
        superior = " ".join(p["texto"] for p in superiores)
        inferior = " ".join(p["texto"] for p in inferiores)

        resultado.append(
            {
                "referencia": registro["referencia"],
                "superior": superior,
                "inferior": inferior,
            }
        )
    return resultado


def interpretar_armaduras(registros_por_nivel):
    """Convierte las descripciones del plano en datos estructurados."""
    interpretadas = []
    for registro in registros_por_nivel:
        for nivel in ("superior", "inferior"):
            texto = registro[nivel]
            coincidencias = list(PATRON_ARMADURA.finditer(texto))
            for coincidencia in coincidencias:
                direccion = coincidencia.group(1).upper() if coincidencia.group(1) else "AMBOS_SENTIDOS"
                interpretadas.append(
                    {
                        "referencia": registro["referencia"],
                        "nivel": nivel.upper(),
                        "direccion": direccion,
                        "cantidad_indicada": int(coincidencia.group(2)),
                        "diametro_pulgadas": coincidencia.group(3).replace(" ", ""),
                        "separacion_cm": Decimal(coincidencia.group(4).replace(",", ".")),
                    }
                )
    return interpretadas


def expandir_direcciones(especificaciones):
    """Transforma 'ambos sentidos' en un registro X y otro Y."""
    resultado = []
    for especificacion in especificaciones:
        direcciones = ("X", "Y") if especificacion["direccion"] == "AMBOS_SENTIDOS" else (especificacion["direccion"],)
        for direccion in direcciones:
            resultado.append({**especificacion, "direccion": direccion})
    return resultado


def diametro_pulgadas_a_mm(fraccion):
    """Convierte, por ejemplo, 5/8 pulgadas a milímetros."""
    numerador, denominador = fraccion.split("/")
    return Decimal(numerador) / Decimal(denominador) * Decimal("25.4")


def peso_unitario_kg_m(diametro_mm):
    """Calcula kg/m con la fórmula habitual d²/162."""
    return diametro_mm**2 / Decimal("162")


def calcular_cantidad_barras(especificaciones, dimensiones, recubrimiento_cm):
    """Calcula barras por malla sin superar la separación indicada."""
    recubrimiento_m = recubrimiento_cm / Decimal("100")
    dimensiones_por_tipo = {fila["referencia"]: fila for fila in dimensiones}
    resultado = []

    for especificacion in especificaciones:
        dimension = dimensiones_por_tipo[especificacion["referencia"]]
        # Las barras X se distribuyen sobre Y; las barras Y se distribuyen sobre X.
        dimension_distribucion = dimension["y"] if especificacion["direccion"] == "X" else dimension["x"]
        longitud_disponible = dimension_distribucion - Decimal("2") * recubrimiento_m
        separacion_m = especificacion["separacion_cm"] / Decimal("100")
        cantidad_intervalos = int((longitud_disponible / separacion_m).to_integral_value(rounding=ROUND_CEILING))
        cantidad_posiciones = cantidad_intervalos + 1
        cantidad_barras = cantidad_posiciones * especificacion["cantidad_indicada"]
        separacion_real = longitud_disponible / Decimal(cantidad_intervalos)

        resultado.append(
            {
                **especificacion,
                "dimension_distribucion_m": dimension_distribucion,
                "longitud_disponible_m": longitud_disponible,
                "cantidad_posiciones": cantidad_posiciones,
                "cantidad_barras": cantidad_barras,
                "separacion_real_m": separacion_real,
            }
        )
    return resultado


def calcular_peso_acero(registros, dimensiones, conteo_fundaciones, recubrimiento_cm, doblez_cm):
    """Calcula longitud y peso teóricos de todas las barras."""
    dimensiones_por_tipo = {fila["referencia"]: fila for fila in dimensiones}
    recubrimiento_m = recubrimiento_cm / Decimal("100")
    doblez_m = doblez_cm / Decimal("100")
    resultado = []

    for registro in registros:
        dimension = dimensiones_por_tipo[registro["referencia"]]
        longitud_planta = dimension["x"] if registro["direccion"] == "X" else dimension["y"]
        longitud_barra = longitud_planta - Decimal("2") * recubrimiento_m + Decimal("2") * doblez_m
        metros_por_fundacion = Decimal(registro["cantidad_barras"]) * longitud_barra
        cantidad_fundaciones = conteo_fundaciones[registro["referencia"]]
        metros_totales = metros_por_fundacion * Decimal(cantidad_fundaciones)
        diametro_mm = diametro_pulgadas_a_mm(registro["diametro_pulgadas"])
        kg_m = peso_unitario_kg_m(diametro_mm)

        resultado.append(
            {
                **registro,
                "cantidad_fundaciones": cantidad_fundaciones,
                "longitud_barra_m": longitud_barra,
                "metros_por_fundacion": metros_por_fundacion,
                "peso_por_fundacion_kg": metros_por_fundacion * kg_m,
                "metros_totales": metros_totales,
                "diametro_mm": diametro_mm,
                "peso_unitario_kg_m": kg_m,
                "peso_total_kg": metros_totales * kg_m,
            }
        )
    return resultado


def resumir_por_diametro(registros):
    """Agrupa metros y kilogramos por diámetro comercial."""
    grupos = defaultdict(lambda: {"metros_totales": Decimal("0"), "peso_total_kg": Decimal("0")})
    for registro in registros:
        grupo = grupos[registro["diametro_pulgadas"]]
        grupo["diametro_pulgadas"] = registro["diametro_pulgadas"]
        grupo["diametro_mm"] = registro["diametro_mm"]
        grupo["peso_unitario_kg_m"] = registro["peso_unitario_kg_m"]
        grupo["metros_totales"] += registro["metros_totales"]
        grupo["peso_total_kg"] += registro["peso_total_kg"]
    return [grupos[diametro] for diametro in sorted(grupos)]


def calcular_barras_comerciales(resumen, longitud_barra_m, desperdicio_porcentaje):
    """Convierte los metros teóricos en barras enteras para compra."""
    factor = Decimal("1") + desperdicio_porcentaje / Decimal("100")
    resultado = []
    for grupo in resumen:
        metros_con_desperdicio = grupo["metros_totales"] * factor
        cantidad = int((metros_con_desperdicio / longitud_barra_m).to_integral_value(rounding=ROUND_CEILING))
        metros_compra = Decimal(cantidad) * longitud_barra_m
        resultado.append(
            {
                **grupo,
                "metros_con_desperdicio": metros_con_desperdicio,
                "barras_comerciales": cantidad,
                "metros_compra": metros_compra,
                "excedente_m": metros_compra - grupo["metros_totales"],
                "peso_con_desperdicio_kg": grupo["peso_total_kg"] * factor,
                "peso_compra_kg": metros_compra * grupo["peso_unitario_kg_m"],
            }
        )
    return resultado
