import axios from 'axios';

// Configuramos la URL base donde tu compañera va a levantar su FastAPI (por defecto suele ser el puerto 8000)
const API_URL = 'http://localhost:8001';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    // Esto le avisa al backend que vamos a manejar datos pesados/archivos binarios en las cargas
    'Accept': 'application/json',
  },
});

export const serviciosAPI = {
  /**
   * Envia el archivo del plano (PDF o Imagen) al backend de Python
   * @param {File} archivoBinario - El archivo seleccionado por el usuario
   */
  enviarPlanoAAvalisis: async (archivoBinario, archivoDetalles = null) => {
    const formData = new FormData();
    // 'file' debe coincidir exactamente con el parámetro que declara el endpoint FastAPI
    formData.append('file', archivoBinario, archivoBinario.name);
    // Segundo archivo opcional: el backend hace fallback si no se envía
    if (archivoDetalles) {
      formData.append('file_detalles', archivoDetalles, archivoDetalles.name);
    }

    try {
      // Sin 'Content-Type' manual: Axios genera el boundary automáticamente
      const respuesta = await api.post('/api/v1/analizar-plano', formData);
      return respuesta.data; // Devuelve el JSON con las métricas y la tabla de fundaciones reales
    } catch (error) {
      throw error;
    }
  },

  /**
   * Trae el historial de proyectos guardados en la Base de Datos para el Dashboard
   */
  obtenerHistorialProyectos: async () => {
    try {
      const respuesta = await api.get('/api/v1/proyectos/historial');
      return respuesta.data;
    } catch (error) {
      throw error;
    }
  }
};

export default api;
