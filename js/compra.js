import { API } from "./api.js";

// --- Estado de la página ---
let eventoId = null;
let sectorSeleccionado = null;
let asientoSeleccionado = null;

// --- Obtener eventId de la URL ---
const params = new URLSearchParams(window.location.search);
eventoId = params.get("eventId");

// --- Inicializar página ---
document.addEventListener("DOMContentLoaded", async () => {
  if (!eventoId) {
    mostrarError("No se especificó un evento. Volvé a la página principal.");
    return;
  }
  await cargarEvento();
  await cargarSectores();
});

// --- Cargar info del evento ---
async function cargarEvento() {
  try {
    // Cargamos todos los eventos y filtramos por id
    const eventos = await API.request("events");
    const evento = eventos.find((e) => String(e.id) === String(eventoId));

    if (!evento) {
      mostrarError("Evento no encontrado.");
      return;
    }

    const fecha = new Date(evento.eventDate).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // Breadcrumb
    document.getElementById("breadcrumb-evento").textContent = evento.name;

    // Info card
    document.getElementById("evento-info").innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 class="text-2xl font-bold text-slate-800">${evento.name}</h2>
          <p class="text-slate-500 mt-1">📅 ${fecha} &nbsp;·&nbsp; 📍 ${evento.venue}</p>
        </div>
        <span class="px-3 py-1 text-sm font-bold rounded-full ${
          evento.status === "Active"
            ? "bg-green-100 text-green-700"
            : "bg-red-100 text-red-700"
        }">
          ${evento.status}
        </span>
      </div>
    `;
  } catch {
    mostrarError("Error al cargar el evento.");
  }
}

// --- Cargar sectores del evento ---
async function cargarSectores() {
  const container = document.getElementById("sectores-container");
  try {
    const sectores = await API.request(`events/${eventoId}/sectors`);

    if (!sectores.length) {
      container.innerHTML = `<p class="text-slate-500">No hay sectores disponibles.</p>`;
      return;
    }

    container.innerHTML = "";
    sectores.forEach((sector) => {
      const btn = document.createElement("button");
      btn.className =
        "sector-btn bg-white border border-slate-200 rounded-xl px-5 py-3 text-left hover:border-indigo-400 hover:shadow transition";
      btn.dataset.id = sector.id;
      btn.innerHTML = `
        <p class="font-bold text-slate-800">${sector.name}</p>
        <p class="text-xs text-slate-500">$${Number(sector.price).toLocaleString("es-AR")} · Cap. ${sector.capacity}</p>
      `;
      btn.onclick = () => seleccionarSector(sector, btn);
      container.appendChild(btn);
    });
  } catch {
    container.innerHTML = `<p class="text-red-500">Error al cargar los sectores.</p>`;
  }
}

// --- Seleccionar sector ---
async function seleccionarSector(sector, btn) {
  // Resetear selección anterior
  document.querySelectorAll(".sector-btn").forEach((b) => {
    b.classList.remove("border-indigo-500", "bg-indigo-50", "text-indigo-700");
    b.classList.add("border-slate-200");
  });

  // Marcar activo
  btn.classList.remove("border-slate-200");
  btn.classList.add("border-indigo-500", "bg-indigo-50");

  sectorSeleccionado = sector;
  cancelarSeleccion();
  await cargarAsientos(sector.id);
}

// --- Cargar asientos del sector ---
async function cargarAsientos(sectorId) {
  const section = document.getElementById("asientos-section");
  const container = document.getElementById("asientos-container");

  section.classList.remove("hidden");
  container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400">Cargando asientos...</div>`;

  try {
    const asientos = await API.request(`sector/${sectorId}/seats`);

    if (!asientos.length) {
      container.innerHTML = `<p class="text-slate-500 col-span-full">No hay asientos en este sector.</p>`;
      return;
    }

    // Ordenar por número
    asientos.sort((a, b) => a.seatNumber - b.seatNumber);

    container.innerHTML = "";
    asientos.forEach((asiento) => {
      const disponible = asiento.status === "Available";
      const el = document.createElement("div");

      el.className = `
        asiento flex flex-col items-center justify-center rounded-lg border text-xs font-medium
        aspect-square cursor-pointer transition select-none
        ${
          disponible
            ? "bg-green-50 border-green-400 text-green-700 hover:bg-green-100 hover:scale-105"
            : "bg-red-50 border-red-200 text-red-300 cursor-not-allowed"
        }
      `;
      el.dataset.id = asiento.id;
      el.innerHTML = `
        <span class="text-[10px] opacity-60">${asiento.rowIdentifier || ""}</span>
        <span>${asiento.seatNumber}</span>
      `;

      // Solo los disponibles son clicables
      if (disponible) {
        el.onclick = () => seleccionarAsiento(asiento, el);
      }

      container.appendChild(el);
    });
  } catch {
    container.innerHTML = `<p class="text-red-500 col-span-full">Error al cargar los asientos.</p>`;
  }
}

// --- Seleccionar asiento ---
function seleccionarAsiento(asiento, el) {
  // Desmarcar anterior
  document.querySelectorAll(".asiento.seleccionado").forEach((a) => {
    a.classList.remove("seleccionado", "bg-indigo-500", "border-indigo-500", "text-white");
    a.classList.add("bg-green-50", "border-green-400", "text-green-700");
  });

  // Marcar nuevo
  el.classList.add("seleccionado", "bg-indigo-500", "border-indigo-500", "text-white");
  el.classList.remove("bg-green-50", "border-green-400", "text-green-700");

  asientoSeleccionado = asiento;

  // Mostrar panel
  document.getElementById("info-asiento").textContent =
    `Fila ${asiento.rowIdentifier} · Asiento ${asiento.seatNumber} — ${sectorSeleccionado?.name || ""}`;
  document.getElementById("panel-reserva").classList.remove("hidden");
}

// --- Cancelar selección ---
window.cancelarSeleccion = function () {
  asientoSeleccionado = null;
  document.querySelectorAll(".asiento.seleccionado").forEach((a) => {
    a.classList.remove("seleccionado", "bg-indigo-500", "border-indigo-500", "text-white");
    a.classList.add("bg-green-50", "border-green-400", "text-green-700");
  });
  document.getElementById("panel-reserva").classList.add("hidden");
};

// --- Reservar asiento ---
window.reservarAsiento = async function () {
  if (!asientoSeleccionado) return;

  const userId = parseInt(document.getElementById("user-id").value);
  if (!userId || userId < 1) {
    mostrarToast("Ingresá un User ID válido.", "error");
    return;
  }

  // Mostrar spinner
  const btn = document.getElementById("btn-reservar");
  const texto = document.getElementById("btn-texto");
  const spinner = document.getElementById("btn-spinner");
  btn.disabled = true;
  texto.textContent = "Reservando...";
  spinner.classList.remove("hidden");

  try {
    const res = await API.request("reservations", "POST", {
      seatId: asientoSeleccionado.id,
      userId,
    });

    mostrarToast("✅ Reserva exitosa. ¡El asiento es tuyo!", "success");
    cancelarSeleccion();

    // Recargar asientos para mostrar el nuevo estado
    await cargarAsientos(sectorSeleccionado.id);
  } catch (err) {
    mostrarToast("❌ No se pudo reservar. El asiento puede estar ocupado.", "error");
    // Refrescar mapa ante error de concurrencia
    await cargarAsientos(sectorSeleccionado.id);
    cancelarSeleccion();
  } finally {
    btn.disabled = false;
    texto.textContent = "Confirmar Reserva";
    spinner.classList.add("hidden");
  }
};

// --- Mostrar toast ---
function mostrarToast(mensaje, tipo = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `px-5 py-3 rounded-xl text-sm font-medium shadow-md border animate-fade-in
    ${tipo === "success"
      ? "bg-green-50 border-green-300 text-green-800"
      : "bg-red-50 border-red-300 text-red-800"}`;
  toast.textContent = mensaje;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

// --- Mostrar error general ---
function mostrarError(msg) {
  document.getElementById("evento-info").innerHTML = `
    <div class="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">${msg}</div>
  `;
}