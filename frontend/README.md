# CómputoEstIA - Frontend Platform 🚀

Este es el subsistema de interfaz de usuario de **CómputoEstIA**, una plataforma moderna de ingeniería civil que utiliza visión por computadora y algoritmos en Python para procesar planos de obra, identificar fundaciones estructurales y generar cómputos métricos de materiales automatizados en tiempo real.

La interfaz está diseñada con una estética SaaS Premium basada fielmente en los requerimientos corporativos, utilizando un flujo dinámico de pantallas coordinadas mediante estados de React.

---

## 🛠️ Tecnologías y Herramientas Utilizadas

- **Framework:** [React.js](https://react.dev) + [Vite](https://vite.dev) (Entorno ultra rápido de desarrollo).
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com) (Compilación optimizada mediante PostCSS).
- **Iconografía:** [Lucide React](https://lucide.dev) (Vectores limpios de arquitectura e ingeniería).
- **Conexión HTTP:** [Axios](https://axios-http.com) (Peticiones asincrónicas preparadas para streaming de archivos binarios).

---

## 📂 Estructura de Carpetas (Arquitectura Modular)

El código fuente (`src/`) se encuentra desacoplado por funcionalidades para permitir un crecimiento escalable del software:

```text
src/
├── components/
│   └── SidebarLateral.jsx  # Menú de navegación principal izquierdo de la plataforma.
├── features/
│   ├── dashboard/
│   │   └── VistaDashboard.jsx # Panel histórico, KPIs globales y selector de archivos nativo.
│   ├── analisis/
│   │   └── PantallaCarga.jsx  # Interfaz del anillo de procesamiento HTTP (comunicación con Python).
│   └── resultados/
│       └── VistaResultados.jsx # Grilla técnica de fundaciones (Mapeo dinámico del JSON del Backend).
├── services/
│   └── api.js              # Instancia centralizada de Axios y endpoints de conexión HTTP.
├── App.jsx                  # Enrutador de estados globales y layout maestro.
├── index.css                # Directivas de importación globales de Tailwind v4.
└── main.jsx                 # Punto de entrada de la aplicación.
```

---

## 🚀 Instrucciones para Instalación y Despliegue Local

Asegurate de tener instalado [Node.js](https://nodejs.org) (versión 18 o superior). Seguí estos pasos en tu terminal:

### 1. Clonar e ingresar a la rama correspondiente
Si descargás el repositorio por primera vez, movete a la rama dedicada al frontend:
```bash
git checkout frontEnd
```

### 2. Instalar dependencias del proyecto
Descarga todos los paquetes necesarios (`axios`, `lucide-react`, `tailwindcss`, etc.):
```bash
npm install
```

### 3. Levantar el servidor de desarrollo
Inicia el entorno de pruebas local de Vite:
```bash
npm run dev
```
Una vez ejecutado, abrí tu navegador en la dirección local indicada (por defecto: `http://localhost:5173`).

---

## 🔌 Especificaciones de Integración (Contrato API Backend)

El servicio HTTP (`src/services/api.js`) apunta por defecto a `http://localhost:8000` (puerto estándar de FastAPI).

### Endpoint de Carga de Planos
- **Ruta:** `/api/v1/analizar-plano`
- **Método:** `POST`
- **Content-Type:** `multipart/form-data`
- **Parámetro requerido:** `file` (Archivo binario: PDF, PNG, JPG, JPEG)

### Estructura de Retorno Esperada (JSON)
Para que las tarjetas y la tabla de fundaciones se autogeneren de manera limpia, el script de Python debe responder con el siguiente formato de claves:

```json
{
  "proyecto_id": "string",
  "nombre_archivo": "string",
  "metricas_globales": {
    "total_referencias": 61,
    "tipos_identificados": 13,
    "volumen_hormigon_total": "129,484 m³",
    "precision_algoritmo": "94.2%"
  },
  "tabla_fundaciones": [
    {
      "id": "F1",
      "tipo": "F1",
      "cantidad": 4,
      "dimensiones": "1.40 × 1.40 × 0.35 m",
      "volUnitario": "0.686 m³",
      "volTotal": "2.744 m³"
    }
  ]
}
```

> ⚠️ **Nota sobre CORS:** Recordá activar el `CORSMiddleware` en FastAPI permitiendo el origen del puerto de Vite (`http://localhost:5173`) para evitar bloqueos de seguridad del navegador durante las pruebas de red.
