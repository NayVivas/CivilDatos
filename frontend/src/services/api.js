import axios from 'axios';

// Configuramos la URL base donde tu compañera va a levantar su FastAPI (por defecto suele ser el puerto 8000)
const API_URL = 'http://localhost:8000';

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
  enviarPlanoAAvalisis: async (archivoBinario) => {
    const formData = new FormData();
    // 'file' debe coincidir exactamente con el parámetro que declare tu compañera en su función de Python
    formData.append('file', archivoBinario);

    try {
      const respuesta = await api.post('/api/v1/analizar-plano', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return respuesta.data; // Devuelve el JSON con las métricas y la tabla de fundaciones reales
    } catch (error) {
      console.error("Error en la conexión con CómputoEstIA API:", error);
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
      console.error("Error al traer el historial:", error);
      throw error;
    }
  }
};

export default api;
