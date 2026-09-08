"""Cómputo del encofrado lateral de zapatas."""

from decimal import Decimal


def calcular_encofrado_zapatas(dimensiones, conteo, usar_encofrado=True):
    """Calcula el área de las cuatro caras laterales: 2(X+Y)h."""
    resultados = []
    total = Decimal("0")

    for fundacion in dimensiones:
        cantidad = conteo[fundacion["referencia"]]
        area_unitaria = (
            Decimal("2") * (fundacion["x"] + fundacion["y"]) * fundacion["h"]
            if usar_encofrado
            else Decimal("0")
        )
        area_total = area_unitaria * Decimal(cantidad)
        resultados.append(
            {
                "referencia": fundacion["referencia"],
                "cantidad": cantidad,
                "area_unitaria_m2": area_unitaria,
                "area_total_m2": area_total,
            }
        )
        total += area_total

    return resultados, total
