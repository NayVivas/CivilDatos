"""Detección de columnas y asociación espacial con fundaciones."""

from math import hypot
import re
from pathlib import Path

import pymupdf


PATRON_COLUMNA = re.compile(r"^C\d+$", re.IGNORECASE)


def detectar_columnas(palabras):
    """Busca referencias C1, C2, C3... y conserva sus coordenadas."""
    columnas = []
    for palabra in palabras:
        texto = palabra["texto"].strip().upper()
        if PATRON_COLUMNA.fullmatch(texto):
            columnas.append(
    {
        "referencia": texto,
        "pagina": palabra["pagina"],

        # Coordenadas del rectángulo del texto
        "x0": palabra["x0"],
        "y0": palabra["y0"],
        "x1": palabra["x1"],
        "y1": palabra["y1"],

        # Punto central del texto
        "centro_x": (
            palabra["x0"]
            + palabra["x1"]
        ) / 2,

        "centro_y": (
            palabra["y0"]
            + palabra["y1"]
        ) / 2,
    }
)
    return columnas


def asociar_columnas_a_fundaciones(fundaciones, columnas, distancia_maxima=None):
    """Asocia cada fundación con la referencia de columna más cercana."""
    asociaciones = []
    for fundacion in fundaciones:
        candidatas = [columna for columna in columnas if columna["pagina"] == fundacion["pagina"]]
        if not candidatas:
            asociaciones.append({**fundacion, "columna": None, "distancia_pdf": None})
            continue

        columna = min(
            candidatas,
            key=lambda dato: hypot(
                fundacion["centro_x"] - dato["centro_x"],
                fundacion["centro_y"] - dato["centro_y"],
            ),
        )
        distancia = hypot(
            fundacion["centro_x"] - columna["centro_x"],
            fundacion["centro_y"] - columna["centro_y"],
        )
        asociaciones.append(
    {
        **fundacion,

        "columna": (
            columna["referencia"]
            if (
                distancia_maxima is None
                or distancia <= distancia_maxima
            )
            else None
        ),

        "columna_x": columna["centro_x"],
        "columna_y": columna["centro_y"],

        "distancia_pdf": distancia,
    }
)
    return asociaciones

def dibujar_asociaciones(
    ruta_pdf,
    asociaciones,
    ruta_salida,
    pagina_numero=1,
    escala=2,
):
    """
    Dibuja una línea entre cada fundación
    y la columna que se le asignó.
    """

    # ======================================================
    # 1. CONVERTIR LAS RUTAS EN OBJETOS PATH
    # ======================================================

    ruta_pdf = Path(
        ruta_pdf
    )

    ruta_salida = Path(
        ruta_salida
    )

    # Crear la carpeta de salida si no existe.
    ruta_salida.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    # ======================================================
    # 2. ABRIR EL PDF
    # ======================================================

    with pymupdf.open(
        ruta_pdf
    ) as documento:

        pagina = documento[
            pagina_numero - 1
        ]

        # ==================================================
        # 3. RECORRER LAS ASOCIACIONES
        # ==================================================

        for asociacion in asociaciones:

            if (
                asociacion["pagina"]
                != pagina_numero
            ):
                continue

            if asociacion["columna"] is None:
                continue

            punto_fundacion = pymupdf.Point(
                asociacion["centro_x"],
                asociacion["centro_y"],
            )

            punto_columna = pymupdf.Point(
                asociacion["columna_x"],
                asociacion["columna_y"],
            )

            # ==============================================
            # 4. DIBUJAR LA LÍNEA DE ASOCIACIÓN
            # ==============================================

            pagina.draw_line(
                punto_fundacion,
                punto_columna,
                color=(0, 0, 1),
                width=0.7,
                overlay=True,
            )

            # ==============================================
            # 5. MARCAR EL CENTRO DE LA FUNDACIÓN
            # ==============================================

            pagina.draw_circle(
                punto_fundacion,
                radius=1.8,
                color=(1, 0, 0),
                fill=(1, 0, 0),
                overlay=True,
            )

            # ==============================================
            # 6. MARCAR EL CENTRO DE LA COLUMNA
            # ==============================================

            pagina.draw_circle(
                punto_columna,
                radius=1.8,
                color=(0, 0, 1),
                fill=(0, 0, 1),
                overlay=True,
            )

        # ==================================================
        # 7. CONVERTIR LA PÁGINA EN IMAGEN
        # ==================================================

        matriz = pymupdf.Matrix(
            escala,
            escala,
        )

        imagen = pagina.get_pixmap(
            matrix=matriz,
            alpha=False,
        )

        imagen.save(
            str(ruta_salida)
        )
