"""Punto de entrada del proyecto de cómputos métricos."""

import argparse
from pathlib import Path

from armaduras import (
    calcular_barras_comerciales,
    calcular_cantidad_barras,
    calcular_peso_acero,
    expandir_direcciones,
    extraer_textos_armadura,
    interpretar_armaduras,
    resumir_por_diametro,
    separar_niveles_armadura,
)

from config import (
    CORRECCIONES_REFERENCIAS_CUADRO,
    DESPERDICIO_ACERO_PORCENTAJE,
    LONGITUD_BARRA_COMERCIAL_M,
    LONGITUD_DOBLEZ_CM,
    PNG_DIR,
    PROCESSED_DIR,
    RECUBRIMIENTO_FUNDACION_CM,
    REPORT_DIR,
    USAR_ENCOFRADO_ZAPATAS,
)

from encofrado import calcular_encofrado_zapatas

from fundaciones import (
    aplicar_correcciones,
    calcular_volumenes,
    contar_referencias,
    detectar_fundaciones,
    extraer_dimensiones_cuadro,
    localizar_estructura_cuadro,
    validar_referencias,
)

from procesamiento_pdf import (
    dibujar_rectangulos,
    extraer_palabras,
)

from reportes import (
    guardar_csv,
    guardar_json,
)

from columnas import (
    asociar_columnas_a_fundaciones,
    detectar_columnas,
    dibujar_asociaciones
)


def procesar_fundaciones(
    ruta_planta,
    ruta_detalles,
):
    """
    Procesa los planos de planta y detalles de fundaciones.

    Parámetros:
        ruta_planta:
            Ruta del plano donde aparecen las fundaciones.

        ruta_detalles:
            Ruta del plano que contiene el cuadro de dimensiones
            y armaduras.
    """

    # Convertimos las rutas recibidas en objetos Path.
    ruta_planta = Path(ruta_planta)
    ruta_detalles = Path(ruta_detalles)

    # ======================================================
    # 1. LEER LA PLANTA DE FUNDACIONES
    # ======================================================

    palabras_planta = extraer_palabras(
        ruta_planta
    )

    # ======================================================
    # 2. DETECTAR LAS REFERENCIAS F1, F2, F3...
    # ======================================================

    detecciones = detectar_fundaciones(
        palabras_planta
    )

    # ======================================================
    # 3. CONTAR CUÁNTAS FUNDACIONES HAY DE CADA TIPO
    # ======================================================

    conteo = contar_referencias(
        detecciones
    )

    # ======================================================
    # 4. GENERAR LA IMAGEN DE CONTROL
    # ======================================================

    dibujar_rectangulos(
        ruta_planta,
        detecciones,
        PNG_DIR / "fundaciones_detectadas.png",
    )

    # ======================================================
    # 5. LEER EL PLANO DE DETALLES
    # ======================================================

    palabras_detalles = extraer_palabras(
        ruta_detalles
    )

    # ======================================================
    # 6. LOCALIZAR EL CUADRO DE FUNDACIONES
    # ======================================================

    estructura = localizar_estructura_cuadro(
        palabras_detalles
    )

    # ======================================================
    # 7. EXTRAER X, Y Y h
    # ======================================================

    filas_originales = extraer_dimensiones_cuadro(
        palabras_detalles,
        estructura,
    )

    # ======================================================
    # 8. APLICAR CORRECCIONES CONOCIDAS
    # ======================================================

    filas = aplicar_correcciones(
        filas_originales,
        CORRECCIONES_REFERENCIAS_CUADRO,
    )

    # ======================================================
    # 9. VALIDAR PLANTA CONTRA CUADRO
    # ======================================================

    validacion = validar_referencias(
        set(conteo),
        filas,
    )

    if any(validacion.values()):

        raise ValueError(
            "El cuadro no coincide con la planta: "
            f"{validacion}"
        )

    # ======================================================
    # 10. CALCULAR HORMIGÓN
    # ======================================================

    volumenes, volumen_general = calcular_volumenes(
        filas,
        conteo,
    )

    # ======================================================
    # 11. EXTRAER LOS TEXTOS DE ARMADURA
    # ======================================================

    textos = extraer_textos_armadura(
        palabras_detalles,
        estructura,
        filas,
    )

    # ======================================================
    # 12. SEPARAR ARMADURA SUPERIOR E INFERIOR
    # ======================================================

    niveles = separar_niveles_armadura(
        textos
    )

    # ======================================================
    # 13. INTERPRETAR DIÁMETROS Y SEPARACIONES
    # ======================================================

    especificaciones = interpretar_armaduras(
        niveles
    )

    # ======================================================
    # 14. DIVIDIR AMBOS SENTIDOS EN X E Y
    # ======================================================

    direcciones = expandir_direcciones(
        especificaciones
    )

    # ======================================================
    # 15. CALCULAR LA CANTIDAD DE BARRAS
    # ======================================================

    conteos_barras = calcular_cantidad_barras(
        direcciones,
        volumenes,
        RECUBRIMIENTO_FUNDACION_CM,
    )

    # ======================================================
    # 16. CALCULAR METROS Y PESO DEL ACERO
    # ======================================================

    acero = calcular_peso_acero(
        conteos_barras,
        volumenes,
        conteo,
        RECUBRIMIENTO_FUNDACION_CM,
        LONGITUD_DOBLEZ_CM,
    )

    # ======================================================
    # 17. AGRUPAR EL ACERO POR DIÁMETRO
    # ======================================================

    resumen_diametros = resumir_por_diametro(
        acero
    )

    # ======================================================
    # 18. CALCULAR BARRAS COMERCIALES
    # ======================================================

    compra = calcular_barras_comerciales(
        resumen_diametros,
        LONGITUD_BARRA_COMERCIAL_M,
        DESPERDICIO_ACERO_PORCENTAJE,
    )

    # ======================================================
    # 19. CALCULAR ENCOFRADO
    # ======================================================

    encofrados, encofrado_general = (
        calcular_encofrado_zapatas(
            volumenes,
            conteo,
            USAR_ENCOFRADO_ZAPATAS,
        )
    )

    # ======================================================
    # 20. PREPARAR EL RESUMEN
    # ======================================================

    resultado = {
        "archivo_planta": ruta_planta.name,
        "archivo_detalles": ruta_detalles.name,
        "cantidad_fundaciones": sum(
            conteo.values()
        ),
        "conteo_por_tipo": dict(
            sorted(conteo.items())
        ),
        "volumen_hormigon_m3": volumen_general,
        "metros_acero": sum(
            (
                fila["metros_totales"]
                for fila in acero
            ),
            start=0,
        ),
        "peso_acero_kg": sum(
            (
                fila["peso_total_kg"]
                for fila in acero
            ),
            start=0,
        ),
        "barras_comerciales": sum(
            fila["barras_comerciales"]
            for fila in compra
        ),
        "peso_compra_acero_kg": sum(
            (
                fila["peso_compra_kg"]
                for fila in compra
            ),
            start=0,
        ),
        "encofrado_zapatas_m2": (
            encofrado_general
        ),
        "validacion": validacion,
    }

    # ======================================================
    # 21. GUARDAR LOS REPORTES
    # ======================================================

    guardar_json(
        resultado,
        REPORT_DIR / "resumen_general.json",
    )

    guardar_json(
        detecciones,
        PROCESSED_DIR
        / "fundaciones_detectadas.json",
    )

    guardar_csv(
        volumenes,
        REPORT_DIR
        / "volumenes_fundaciones.csv",
    )

    guardar_csv(
        acero,
        REPORT_DIR
        / "acero_fundaciones.csv",
    )

    guardar_csv(
        compra,
        REPORT_DIR
        / "compra_acero.csv",
    )

    guardar_csv(
        encofrados,
        REPORT_DIR
        / "encofrado_zapatas.csv",
    )

    return resultado


def imprimir_resumen(resultado):

    print("=" * 60)
    print("RESUMEN GENERAL DEL CÓMPUTO")
    print("=" * 60)

    print(
        "Fundaciones:",
        resultado["cantidad_fundaciones"],
    )

    print(
        "Hormigón de zapatas:",
        f"{resultado['volumen_hormigon_m3']:.3f}",
        "m³",
    )

    print(
        "Acero teórico:",
        f"{resultado['peso_acero_kg']:.3f}",
        "kg",
    )

    print(
        "Barras comerciales:",
        resultado["barras_comerciales"],
    )

    print(
        "Peso de compra:",
        f"{resultado['peso_compra_acero_kg']:.3f}",
        "kg",
    )

    print(
        "Encofrado lateral:",
        f"{resultado['encofrado_zapatas_m2']:.3f}",
        "m²",
    )

    print(
        "Reportes guardados en:",
        REPORT_DIR,
    )

def experimentar_columna_pedestal(
    ruta_detalles,
):

        print()
        print("=" * 60)
        print(
            "FASE 4 - EXPERIMENTO 1: "
            "EXTRAER COLUMNA PEDESTAL"
        )
        print("=" * 60)

        # ======================================================
        # 1. CONVERTIR LA RUTA EN PATH
        # ======================================================

        ruta_detalles = Path(
            ruta_detalles
        )

        # ======================================================
        # 2. EXTRAER TODAS LAS PALABRAS DEL PDF
        # ======================================================

        palabras = extraer_palabras(
            ruta_detalles
        )

        # ======================================================
        # 3. LOCALIZAR LA ESTRUCTURA DEL CUADRO
        # ======================================================

        estructura = localizar_estructura_cuadro(
            palabras
        )

        encabezados = estructura[
            "encabezados"
        ]

        referencias = estructura[
            "referencias"
        ]

        encabezado_pedestal = encabezados[
            "PEDESTAL"
        ]

        encabezado_armadura = encabezados[
            "ARMADURA"
        ]


        # ======================================================
        # CALCULAR LOS LÍMITES DE LA COLUMNA PEDESTAL
        # ======================================================

        ancho_aproximado_columna = (
            encabezado_pedestal["y0"]
            - encabezado_armadura["y0"]
        )


        limite_inicio_pedestal = (
            encabezado_armadura["y0"]
            + encabezado_pedestal["y0"]
        ) / 2


        limite_fin_pedestal = (
            encabezado_pedestal["y0"]
            + ancho_aproximado_columna / 2
        )

        # ======================================================
        # 4. MOSTRAR LA POSICIÓN DEL ENCABEZADO
        # ======================================================

        print(
            "Encabezado PEDESTAL:",
            "X:",
            encabezado_pedestal["x0"],
            "| Y:",
            encabezado_pedestal["y0"],
        )

        print(
            "Cantidad de filas:",
            len(referencias),
        )

        # ======================================================
        # 5. RECORRER CADA FILA DEL CUADRO
        # ======================================================

        for indice, referencia in enumerate(
            referencias
        ):

            # --------------------------------------------------
            # LÍMITE SUPERIOR DE LA FILA
            # --------------------------------------------------

            if indice == 0:

                limite_superior = (
                    encabezados["TIPO"]["x0"]
                )

            else:

                referencia_anterior = (
                    referencias[indice - 1]
                )

                limite_superior = (
                    referencia_anterior["x0"]
                    + referencia["x0"]
                ) / 2

            # --------------------------------------------------
            # LÍMITE INFERIOR DE LA FILA
            # --------------------------------------------------

            if indice == len(referencias) - 1:

                distancia_anterior = (
                    referencias[indice - 1]["x0"]
                    - referencia["x0"]
                )

                limite_inferior = (
                    referencia["x0"]
                    - distancia_anterior / 2
                )

            else:

                referencia_siguiente = (
                    referencias[indice + 1]
                )

                limite_inferior = (
                    referencia["x0"]
                    + referencia_siguiente["x0"]
                ) / 2

            # ==================================================
            # 6. BUSCAR PALABRAS DE PEDESTAL EN ESTA FILA
            # ==================================================

            palabras_fila = []

            for palabra in palabras:

                esta_en_fila = (
                    limite_inferior
                    <= palabra["x0"]
                    < limite_superior
                )

                esta_en_columna_pedestal = (
                    limite_inicio_pedestal
                    <= palabra["y0"]
                    <= limite_fin_pedestal
                )

                if (
                    esta_en_fila
                    and esta_en_columna_pedestal
                ):

                    palabras_fila.append(
                        palabra
                    )

            # ==================================================
            # 7. ORDENAR LAS PALABRAS
            # ==================================================

            palabras_fila.sort(
                key=lambda palabra: (
                    palabra["y0"]
                )
            )

            texto_fila = " ".join(
                palabra["texto"]
                for palabra in palabras_fila
            )

            # ==================================================
            # 8. MOSTRAR EL RESULTADO
            # ==================================================

            print("-" * 40)

            print(
                "Referencia:",
                referencia["texto"]
            )

            print(
                "Texto pedestal:",
                texto_fila
                or "Sin información",
            )

def experimentar_asociacion_columnas(
    ruta_planta,
):

    print()
    print("=" * 60)
    print(
        "FASE 4 - EXPERIMENTO 2: "
        "ASOCIAR COLUMNAS Y FUNDACIONES"
    )
    print("=" * 60)

    # ======================================================
    # 1. CONVERTIR LA RUTA
    # ======================================================

    ruta_planta = Path(
        ruta_planta
    )

    # ======================================================
    # 2. EXTRAER LAS PALABRAS DE LA PLANTA
    # ======================================================

    palabras = extraer_palabras(
        ruta_planta
    )

    # ======================================================
    # 3. DETECTAR LAS FUNDACIONES
    # ======================================================

    fundaciones = detectar_fundaciones(
        palabras
    )

    # ======================================================
    # 4. DETECTAR LAS COLUMNAS
    # ======================================================

    columnas = detectar_columnas(
        palabras
    )

    print(
        "Fundaciones detectadas:",
        len(fundaciones),
    )

    print(
        "Referencias de columnas detectadas:",
        len(columnas),
    )

    # ======================================================
    # 5. ASOCIAR CADA FUNDACIÓN CON LA COLUMNA MÁS CERCANA
    # ======================================================

    asociaciones = (
        asociar_columnas_a_fundaciones(
            fundaciones,
            columnas,
        )
    )

    print()
    print("=" * 60)
    print(
        "FASE 4 - EXPERIMENTO 4: "
        "VALIDAR ASOCIACIONES ÚNICAS"
    )
    print("=" * 60)

    # ======================================================
    # 1. CREAR UNA CLAVE PARA CADA POSICIÓN DE COLUMNA
    # ======================================================

    def crear_clave_columna(
        centro_x,
        centro_y,
    ):

        return (
            round(centro_x, 2),
            round(centro_y, 2),
        )

    # ======================================================
    # 2. GUARDAR TODAS LAS COLUMNAS DETECTADAS
    # ======================================================

    columnas_detectadas = {}

    for columna in columnas:

        clave = crear_clave_columna(
            columna["centro_x"],
            columna["centro_y"],
        )

        columnas_detectadas[clave] = columna

    # ======================================================
    # 3. CONTAR CUÁNTAS FUNDACIONES UTILIZAN CADA COLUMNA
    # ======================================================

    usos_columnas = {}

    for asociacion in asociaciones:

        if asociacion["columna"] is None:
            continue

        clave = crear_clave_columna(
            asociacion["columna_x"],
            asociacion["columna_y"],
        )

        if clave not in usos_columnas:

            usos_columnas[clave] = []

        usos_columnas[clave].append(
            asociacion
        )

    # ======================================================
    # 4. BUSCAR COLUMNAS QUE NO FUERON ASOCIADAS
    # ======================================================

    columnas_sin_fundacion = []

    for clave, columna in (
        columnas_detectadas.items()
    ):

        if clave not in usos_columnas:

            columnas_sin_fundacion.append(
                columna
            )

    # ======================================================
    # 5. BUSCAR COLUMNAS UTILIZADAS MÁS DE UNA VEZ
    # ======================================================

    columnas_repetidas = []

    for clave, asociaciones_columna in (
        usos_columnas.items()
    ):

        if len(asociaciones_columna) > 1:

            columnas_repetidas.append(
                {
                    "clave": clave,
                    "asociaciones": (
                        asociaciones_columna
                    ),
                }
            )

    # ======================================================
    # 6. MOSTRAR COLUMNAS SIN FUNDACIÓN
    # ======================================================

    print()
    print(
        "COLUMNAS SIN FUNDACIÓN ASOCIADA:",
        len(columnas_sin_fundacion),
    )

    for columna in columnas_sin_fundacion:

        print("-" * 40)

        print(
            "Columna:",
            columna["referencia"],
        )

        print(
            "Centro:",
            round(
                columna["centro_x"],
                2,
            ),
            "|",
            round(
                columna["centro_y"],
                2,
            ),
        )

    # ======================================================
    # 7. MOSTRAR COLUMNAS ASOCIADAS MÁS DE UNA VEZ
    # ======================================================

    print()
    print(
        "COLUMNAS ASOCIADAS A MÁS "
        "DE UNA FUNDACIÓN:",
        len(columnas_repetidas),
    )

    for repetida in columnas_repetidas:

        asociaciones_columna = (
            repetida["asociaciones"]
        )

        print("-" * 40)

        print(
            "Columna:",
            asociaciones_columna[0][
                "columna"
            ],
        )

        print(
            "Centro:",
            repetida["clave"],
        )

        print(
            "Fundaciones asociadas:",
            [
                asociacion["referencia"]
                for asociacion
                in asociaciones_columna
            ],
        )

    # ======================================================
    # 8. MOSTRAR ASOCIACIONES CON DISTANCIA ELEVADA
    # ======================================================

    distancia_revision = 18

    asociaciones_distantes = [
        asociacion
        for asociacion in asociaciones
        if (
            asociacion["distancia_pdf"]
            is not None
            and asociacion["distancia_pdf"]
            > distancia_revision
        )
    ]

    print()
    print(
        "ASOCIACIONES CON DISTANCIA MAYOR A",
        distancia_revision,
        ":",
        len(asociaciones_distantes),
    )

    for asociacion in asociaciones_distantes:

        print("-" * 40)

        print(
            asociacion["referencia"],
            "->",
            asociacion["columna"],
            "| Distancia:",
            round(
                asociacion["distancia_pdf"],
                2,
            ),
            "| Fundación:",
            (
                round(
                    asociacion["centro_x"],
                    2,
                ),
                round(
                    asociacion["centro_y"],
                    2,
                ),
            ),
            "| Columna:",
            (
                round(
                    asociacion["columna_x"],
                    2,
                ),
                round(
                    asociacion["columna_y"],
                    2,
                ),
            ),
        )

    # ======================================================
    # 6. MOSTRAR LAS ASOCIACIONES
    # ======================================================

    for asociacion in asociaciones:

        print("-" * 40)

        print(
            "Fundación:",
            asociacion["referencia"],
        )

        print(
            "Columna:",
            asociacion["columna"]
            or "No encontrada",
        )

        if asociacion["distancia_pdf"] is not None:

            print(
                "Distancia en el PDF:",
                round(
                    asociacion[
                        "distancia_pdf"
                    ],
                    2,
                ),
            )

    ruta_imagen = (
    PNG_DIR
    / "asociaciones_columnas_fundaciones.png"
    )

    dibujar_asociaciones(
        ruta_planta,
        asociaciones,
        ruta_imagen,
    )

    print()
    print(
        "Imagen de validación guardada en:",
        ruta_imagen,
    )

    return asociaciones

def experimentar_detalles_columnas(
    ruta_detalles,
):

    print()
    print("=" * 60)
    print(
        "FASE 4 - EXPERIMENTO 5: "
        "LOCALIZAR DETALLES DE COLUMNAS"
    )
    print("=" * 60)

    # ======================================================
    # 1. LEER EL PDF DE DETALLES
    # ======================================================

    ruta_detalles = Path(
        ruta_detalles
    )

    palabras = extraer_palabras(
        ruta_detalles
    )

    # ======================================================
    # 2. BUSCAR REFERENCIAS C1, C2, C3...
    # ======================================================

    columnas_en_detalles = (
        detectar_columnas(
            palabras
        )
    )

    print(
        "Referencias encontradas:",
        len(columnas_en_detalles),
    )

    # ======================================================
    # 3. ORDENAR POR PÁGINA Y POSICIÓN
    # ======================================================

    columnas_en_detalles.sort(
        key=lambda columna: (
            columna["pagina"],
            columna["centro_x"],
            columna["centro_y"],
        )
    )

    # ======================================================
    # 4. MOSTRAR LAS REFERENCIAS Y SUS COORDENADAS
    # ======================================================

    for numero, columna in enumerate(
        columnas_en_detalles,
        start=1,
    ):

        print("-" * 40)

        print(
            "Detección:",
            numero,
        )

        print(
            "Referencia:",
            columna["referencia"],
        )

        print(
            "Página:",
            columna["pagina"],
        )

        print(
            "Centro:",
            round(
                columna["centro_x"],
                2,
            ),
            "|",
            round(
                columna["centro_y"],
                2,
            ),
        )


def main():

    # ======================================================
    # CREAR LOS ARGUMENTOS DEL PROGRAMA
    # ======================================================

    parser = argparse.ArgumentParser(
        description=(
            "Calcula cómputos métricos de "
            "fundaciones desde planos PDF."
        )
    )

    parser.add_argument(
    "--planta",
    default=(
        "data/pdf/Fundaciones/"
        "Fundaciones_1.pdf"
    ),
    help=(
        "Ruta del plano de planta de fundaciones. "
        "Si no se indica, se utiliza Fundaciones_1.pdf."
    ),
    )

    parser.add_argument(
        "--detalles",
        default=(
            "data/pdf/Fundaciones/"
            "Fundaciones_2.pdf"
        ),
        help=(
            "Ruta del plano con detalles de fundaciones. "
            "Si no se indica, se utiliza Fundaciones_2.pdf."
        ),
    )

    argumentos = parser.parse_args()

    # ======================================================
    # PROCESAR LOS ARCHIVOS SELECCIONADOS
    # ======================================================

    resultado = procesar_fundaciones(
        argumentos.planta,
        argumentos.detalles,
    )

    imprimir_resumen(
        resultado
    )

    experimentar_columna_pedestal(
        argumentos.detalles
    )

    experimentar_asociacion_columnas(
        argumentos.planta
    )

    experimentar_detalles_columnas(
        argumentos.detalles
    )


if __name__ == "__main__":
    main()