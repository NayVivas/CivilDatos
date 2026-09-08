"""Reglas geométricas para pedestales. Se activarán al leer sus dimensiones."""

from decimal import Decimal


def calcular_volumen_pedestal(ancho_m, largo_m, altura_m, cantidad=1):
    """Calcula el volumen unitario y total de un pedestal rectangular."""
    volumen_unitario = Decimal(ancho_m) * Decimal(largo_m) * Decimal(altura_m)
    return {
        "volumen_unitario_m3": volumen_unitario,
        "volumen_total_m3": volumen_unitario * Decimal(cantidad),
    }


def calcular_encofrado_pedestal(ancho_m, largo_m, altura_m, cantidad=1):
    """Calcula las cuatro caras verticales del pedestal."""
    area_unitaria = Decimal("2") * (Decimal(ancho_m) + Decimal(largo_m)) * Decimal(altura_m)
    return {
        "area_unitaria_m2": area_unitaria,
        "area_total_m2": area_unitaria * Decimal(cantidad),
    }
