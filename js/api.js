// Definimos la URL base fuera del objeto para que sea fácil de cambiar
const BASE_URL = "https://localhost:7243/api/v1";

// Exportamos el objeto API una sola vez
export const API = {
  async request(endpoint, method = "GET", data = null) {
    const url = `${BASE_URL}/${endpoint}`;

    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
      }

      return await response.json();
    } catch (err) {
      console.error(`Fallo en la petición a ${endpoint}:`, err);
      throw err;
    }
  },
};
