import { API } from "./api.js";

const container = document.getElementById("eventos-container");

async function cargarEventos() {
  try {
    const eventos = await API.request("events");
    renderizarTarjetas(eventos);
  } catch (error) {
    container.innerHTML = `<p class="text-center py-10 text-red-500">Error al conectar con la API</p>`;
  }
}

function renderizarTarjetas(lista) {
  if (lista.length === 0) {
    container.innerHTML = `<p class="text-center py-10">No hay eventos disponibles.</p>`;
    return;
  }

  container.innerHTML = lista
    .map((evento) => {
      // Formatear la fecha para que sea legible en Argentina
      const fecha = new Date(evento.eventDate).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });

      return `
        <div class="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-md transition-all">
            <div class="p-6">
                <div class="flex justify-between items-start mb-4">
                    <h4 class="text-xl font-bold text-slate-800">${evento.name}</h4>
                    <span class="px-2 py-1 text-xs font-bold rounded ${evento.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}">
                        ${evento.status}
                    </span>
                </div>
                
                <div class="space-y-2 mb-6 text-sm text-slate-600">
                    <p class="flex items-center gap-2">
                        <span>📅</span> ${fecha}
                    </p>
                    <p class="flex items-center gap-2">
                        <span>📍</span> ${evento.venue}
                    </p>
                </div>

                <button onclick="seleccionarEvento(${evento.id})" 
                        class="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-colors">
                    Realizar Reservacion
                </button>
            </div>
        </div>
        `;
    })
    .join("");
}

// Función para manejar el clic (puedes llevarlo a otra página de compra)
window.seleccionarEvento = (id) => {
  console.log("Evento seleccionado:", id);
  // window.location.href = `compra.html?id=${id}`;
};

document.addEventListener("DOMContentLoaded", cargarEventos);
