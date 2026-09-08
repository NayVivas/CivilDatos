@"
# Proyecto Final - Procesamiento de Planos

Proyecto de procesamiento de planos PDF desarrollado en Python.

## Requisitos

- Python 3.13.x
- Windows
- PowerShell

## Instalación

1. Crear el entorno virtual:

python -m venv .venv

2. Activar el entorno virtual:

.\.venv\Scripts\Activate.ps1

3. Instalar las dependencias:

python -m pip install -r requirements.txt

## Ejecución

Con el entorno virtual activado:

python app.py

## Estructura básica

ProyectoFinal/
├── app.py
├── config.py
├── requirements.txt
├── README.md
├── .gitignore
└── data/
    └── pdf/

## Importante

No se debe compartir la carpeta .venv.
Cada integrante debe crear su propio entorno virtual.
"@ | Set-Content README.md




# Proyecto final — cómputos métricos desde planos PDF

Esta versión separa el prototipo por responsabilidades. `app.py` coordina el
proceso, pero no contiene las fórmulas ni la lógica de lectura.

## Archivos

- `config.py`: rutas y parámetros modificables.
- `procesamiento_pdf.py`: lectura del PDF y coordenadas.
- `fundaciones.py`: referencias, cuadro de dimensiones y hormigón.
- `armaduras.py`: interpretación, barras, peso y compra de acero.
- `encofrado.py`: superficie lateral de las zapatas.
- `columnas.py`: detección y asociación espacial de columnas.
- `pedestales.py`: fórmulas geométricas iniciales de pedestales.
- `reportes.py`: exportación a JSON y CSV.
- `app.py`: orden de ejecución.

## Ubicación de los planos

Copiar los archivos en:

```text
data/pdf/Fundaciones/Fundaciones_1.pdf
data/pdf/Fundaciones/Fundaciones_2.pdf
```

## Ejecución

```powershell
pip install -r requirements.txt
python app.py
```

Los resultados se crean en `data/reportes`, `data/processed` y `data/png`.

## Importante

La corrección de la segunda aparición de `F12` a `F13` está declarada en
`config.py`; no queda escondida dentro del algoritmo. `columnas.py` y
`pedestales.py` están separados, pero todavía no se incorporan al flujo final
hasta validar las dimensiones y alturas de pedestal del plano.
