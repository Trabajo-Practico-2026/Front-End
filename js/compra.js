import { API } from "./api.js";

// --- Estado de la página ---
let eventoId = null;
let sectorSeleccionado = null;
let asientoSeleccionado = null;
let intervaloTemporizador = null;

// --- Obtener eventId de la URL ---
const params = new URLSearchParams(window.location.search);
eventoId = params.get("eventId");

// --- Inicializar página ---
document.addEventListener("DOMContentLoaded", async () => {
  if (!eventoId) {
    mostrarError("No se especificó un evento. Volvé a la página principal.");
    return;
  }

  // Conectar botón de login
  document.getElementById("btn-login").addEventListener("click", confirmarLogin);

  // Verificar si ya hay sesión activa
  const sesion = obtenerSesion();
  if (sesion) {
    ocultarModalLogin();
    mostrarUsuarioEnHeader(sesion.nombre);
  }

  // Restaurar reserva activa si existe en sessionStorage
  restaurarReservaActiva();

  await cargarEvento();
  await cargarSectores();
});

// --- LOGIN SIMULADO ---
function confirmarLogin() {
  const nombre = document.getElementById("login-nombre").value.trim();
  const userId = parseInt(document.getElementById("login-userid").value);

  if (!nombre) {
    alert("Ingresá tu nombre.");
    return;
  }
  if (!userId || userId < 1) {
    alert("Ingresá un User ID válido.");
    return;
  }

  // Guardar sesión en sessionStorage
  sessionStorage.setItem("sesion", JSON.stringify({ nombre, userId }));
  ocultarModalLogin();
  mostrarUsuarioEnHeader(nombre);
}

function ocultarModalLogin() {
  document.getElementById("modal-login").classList.add("hidden");
}

function obtenerSesion() {
  const raw = sessionStorage.getItem("sesion");
  return raw ? JSON.parse(raw) : null;
}

function mostrarUsuarioEnHeader(nombre) {
  const el = document.getElementById("header-usuario");
  el.textContent = `👤 ${nombre}`;
  el.classList.remove("hidden");
}

// --- Cargar info del evento ---
async function cargarEvento() {
  try {
    const eventos = await API.request("events");
    const evento = eventos.find((e) => String(e.id) === String(eventoId));
    if (!evento) { mostrarError("Evento no encontrado."); return; }

    const fecha = new Date(evento.eventDate).toLocaleDateString("es-AR", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit",
    });

    document.getElementById("breadcrumb-evento").textContent = evento.name;
    document.getElementById("evento-info").innerHTML = `
      <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 class="text-2xl font-bold text-slate-800">${evento.name}</h2>
          <p class="text-slate-500 mt-1">📅 ${fecha} &nbsp;·&nbsp; 📍 ${evento.venue}</p>
        </div>
        <span class="px-3 py-1 text-sm font-bold rounded-full ${
          evento.status === "Active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        }">${evento.status}</span>
      </div>
    `;
  } catch { mostrarError("Error al cargar el evento."); }
}

// --- Cargar sectores ---
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
      btn.className = "sector-btn bg-white border border-slate-200 rounded-xl px-5 py-3 text-left hover:border-indigo-400 hover:shadow transition";
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
  document.querySelectorAll(".sector-btn").forEach((b) => {
    b.classList.remove("border-indigo-500", "bg-indigo-50");
    b.classList.add("border-slate-200");
  });
  btn.classList.remove("border-slate-200");
  btn.classList.add("border-indigo-500", "bg-indigo-50");
  sectorSeleccionado = sector;
  cancelarSeleccion();
  await cargarAsientos(sector.id);
}

// --- Cargar asientos ---
async function cargarAsientos(sectorId) {
  const section = document.getElementById("asientos-section");
  const container = document.getElementById("asientos-container");
  section.classList.remove("hidden");
  container.innerHTML = `<div class="col-span-full text-center py-8 text-slate-400">Cargando asientos...</div>`;
  try {
    const asientos = await API.request(`sector/${sectorId}/seats`);
    if (!asientos.length) {
      container.innerHTML = `<p class="text-slate-500 col-span-full">No hay asientos.</p>`;
      return;
    }
    asientos.sort((a, b) => a.seatNumber - b.seatNumber);
    container.innerHTML = "";
    asientos.forEach((asiento) => {
      const disponible = asiento.status === "Available";
      const el = document.createElement("div");
      el.className = `asiento flex flex-col items-center justify-center rounded-lg border text-xs font-medium aspect-square cursor-pointer transition select-none
        ${disponible
          ? "bg-green-50 border-green-400 text-green-700 hover:bg-green-100 hover:scale-105"
          : "bg-red-50 border-red-200 text-red-300 cursor-not-allowed"}`;
      el.dataset.id = asiento.id;
      el.innerHTML = `
        <span class="text-[10px] opacity-60">${asiento.rowIdentifier || ""}</span>
        <span>${asiento.seatNumber}</span>
      `;
      if (disponible) el.onclick = () => seleccionarAsiento(asiento, el);
      container.appendChild(el);
    });
  } catch {
    container.innerHTML = `<p class="text-red-500 col-span-full">Error al cargar los asientos.</p>`;
  }
}

// --- Seleccionar asiento ---
function seleccionarAsiento(asiento, el) {
  document.querySelectorAll(".asiento.seleccionado").forEach((a) => {
    a.classList.remove("seleccionado", "bg-indigo-500", "border-indigo-500", "text-white");
    a.classList.add("bg-green-50", "border-green-400", "text-green-700");
  });
  el.classList.add("seleccionado", "bg-indigo-500", "border-indigo-500", "text-white");
  el.classList.remove("bg-green-50", "border-green-400", "text-green-700");
  asientoSeleccionado = asiento;
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

  const sesion = obtenerSesion();
  if (!sesion) { mostrarToast("Iniciá sesión primero.", "error"); return; }

  const btn = document.getElementById("btn-reservar");
  const texto = document.getElementById("btn-texto");
  const spinner = document.getElementById("btn-spinner");
  btn.disabled = true;
  texto.textContent = "Reservando...";
  spinner.classList.remove("hidden");

  try {
    const res = await API.request("reservations", "POST", {
      seatId: asientoSeleccionado.id,
      userId: sesion.userId,
    });

    const reservaActiva = {
      reservationId: res.reservationId || res.id || null,
      seatInfo: `Fila ${asientoSeleccionado.rowIdentifier} · Asiento ${asientoSeleccionado.seatNumber} — ${sectorSeleccionado?.name || ""}`,
      expiraEn: Date.now() + 5 * 60 * 1000,
    };
    sessionStorage.setItem("reservaActiva", JSON.stringify(reservaActiva));

    mostrarToast("✅ Reserva exitosa. Tenés 5 minutos para pagar.", "success");
    cancelarSeleccion();
    mostrarWidgetTimer(reservaActiva);
    await cargarAsientos(sectorSeleccionado.id);

  } catch {
    mostrarToast("❌ El asiento ya fue tomado por otro usuario. El mapa fue actualizado.", "error");
    await cargarAsientos(sectorSeleccionado.id);
    cancelarSeleccion();
  } finally {
    btn.disabled = false;
    texto.textContent = "Confirmar Reserva";
    spinner.classList.add("hidden");
  }
};

// --- Widget flotante del temporizador ---
function mostrarWidgetTimer(reservaActiva) {
  document.getElementById("widget-asiento").textContent = reservaActiva.seatInfo;
  document.getElementById("widget-timer").classList.remove("hidden");
  iniciarCuentaRegresiva(reservaActiva.expiraEn);
}

function iniciarCuentaRegresiva(expiraEn) {
  if (intervaloTemporizador) clearInterval(intervaloTemporizador);

  intervaloTemporizador = setInterval(() => {
    const restantes = Math.max(0, Math.floor((expiraEn - Date.now()) / 1000));
    const min = Math.floor(restantes / 60).toString().padStart(2, "0");
    const seg = (restantes % 60).toString().padStart(2, "0");
    const display = document.getElementById("widget-countdown");

    if (display) {
      display.textContent = `${min}:${seg}`;
      if (restantes <= 60) {
        display.classList.add("text-red-600");
        display.classList.remove("text-indigo-600");
      } else {
        display.classList.add("text-indigo-600");
        display.classList.remove("text-red-600");
      }
    }

    if (restantes <= 0) {
      clearInterval(intervaloTemporizador);
      sessionStorage.removeItem("reservaActiva");
      document.getElementById("widget-timer").classList.add("hidden");
      mostrarToast("⏰ El tiempo expiró. Tu reserva fue liberada.", "error");
      if (sectorSeleccionado) cargarAsientos(sectorSeleccionado.id);
    }
  }, 1000);
}

// --- Restaurar reserva activa al refrescar ---
function restaurarReservaActiva() {
  const raw = sessionStorage.getItem("reservaActiva");
  if (!raw) return;

  const reservaActiva = JSON.parse(raw);
  const restantes = Math.floor((reservaActiva.expiraEn - Date.now()) / 1000);

  if (restantes <= 0) {
    sessionStorage.removeItem("reservaActiva");
    return;
  }

  document.getElementById("widget-asiento").textContent = reservaActiva.seatInfo;
  document.getElementById("widget-timer").classList.remove("hidden");
  iniciarCuentaRegresiva(reservaActiva.expiraEn);
}

// --- Confirmar pago ---
window.confirmarPago = async function () {
  const raw = sessionStorage.getItem("reservaActiva");
  if (!raw) return;

  const reservaActiva = JSON.parse(raw);

  if (!reservaActiva.reservationId) {
    mostrarToast("⚠️ No se encontró el ID de la reserva.", "error");
    return;
  }

  const btnTexto = document.getElementById("pago-texto");
  const spinner = document.getElementById("pago-spinner");
  btnTexto.textContent = "Procesando...";
  spinner.classList.remove("hidden");

  try {
    await API.request(`reservations/${reservaActiva.reservationId}/confirm`, "POST");
    clearInterval(intervaloTemporizador);
    sessionStorage.removeItem("reservaActiva");
    document.getElementById("widget-timer").classList.add("hidden");
    mostrarToast("🎉 ¡Pago confirmado! Tu entrada fue comprada.", "success");
    if (sectorSeleccionado) await cargarAsientos(sectorSeleccionado.id);
  } catch {
    mostrarToast("❌ Error al confirmar el pago. Intentá de nuevo.", "error");
  } finally {
    btnTexto.textContent = "💳 Confirmar Pago";
    spinner.classList.add("hidden");
  }
};

// --- Cancelar reserva activa ---
window.cancelarReservaActiva = function () {
  clearInterval(intervaloTemporizador);
  sessionStorage.removeItem("reservaActiva");
  document.getElementById("widget-timer").classList.add("hidden");
  mostrarToast("Reserva cancelada.", "error");
  if (sectorSeleccionado) cargarAsientos(sectorSeleccionado.id);
};

// --- Toast ---
function mostrarToast(mensaje, tipo = "success") {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = `px-5 py-3 rounded-xl text-sm font-medium shadow-md border
    ${tipo === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"}`;
  toast.textContent = mensaje;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
}

function mostrarError(msg) {
  document.getElementById("evento-info").innerHTML = `
    <div class="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700">${msg}</div>
  `;
}