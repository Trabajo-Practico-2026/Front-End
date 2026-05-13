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

  if (window.Auth) window.Auth.actualizarUI();
  // Restaurar reserva activa si existe en sessionStorage
  restaurarReservaActiva();

  await cargarEvento();
  await cargarSectores();
  const sectorId = localStorage.getItem("SectorId");
  if (sectorId) cargarAsientos(sectorId);
});

// --- Cargar info del evento ---
async function cargarEvento() {
  try {
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

    document.getElementById("breadcrumb-evento").textContent = evento.name;
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
        }">${evento.status}</span>
      </div>
    `;
  } catch {
    mostrarError("Error al cargar el evento.");
  }
}

// --- Cargar sectores ---
async function cargarSectores() {
  const container = document.getElementById("sectores-container");
  const sectorGuardadoId = localStorage.getItem("SectorId");
  try {
    const sectores = await API.request(`events/${eventoId}/sectors`);
    if (!sectores.length) {
      container.innerHTML = `<p class="text-slate-500">No hay sectores disponibles.</p>`;
      return;
    }
    container.innerHTML = "";
    sectores.forEach((sector) => {
      const btn = document.createElement("button");
      const esSeleccionado = String(sector.id) === String(sectorGuardadoId);
      btn.className = `sector-btn border rounded-xl px-5 py-3 text-left hover:border-indigo-400 hover:shadow transition ${
        esSeleccionado
          ? "border-indigo-500 bg-white"
          : "border-slate-200 bg-white"
      }`;
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
  localStorage.setItem("SectorId", sector.id);
  localStorage.setItem("SectorName", sector.name);
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
        ${
          disponible
            ? "bg-green-50 border-green-400 text-green-700 hover:bg-green-100 hover:scale-105"
            : "bg-red-50 border-red-200 text-red-300 cursor-not-allowed"
        }`;
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
    a.classList.remove(
      "seleccionado",
      "bg-indigo-500",
      "border-indigo-500",
      "text-white",
    );
    a.classList.add("bg-green-50", "border-green-400", "text-green-700");
  });
  el.classList.add(
    "seleccionado",
    "bg-indigo-500",
    "border-indigo-500",
    "text-white",
  );
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
    a.classList.remove(
      "seleccionado",
      "bg-indigo-500",
      "border-indigo-500",
      "text-white",
    );
    a.classList.add("bg-green-50", "border-green-400", "text-green-700");
  });
  document.getElementById("panel-reserva").classList.add("hidden");
};

// --- Reservar asiento ---
window.reservarAsiento = async function () {
  if (!asientoSeleccionado) return;

  const sesion = window.Auth.obtenerSesion();
  if (!sesion) {
    window.Auth.showToast("Iniciá sesión primero.", "error");
    window.Auth.mostrarModal();
    return;
  }

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
      seatInfo: `Fila ${asientoSeleccionado.rowIdentifier} · Asiento ${asientoSeleccionado.seatNumber} — ${sectorSeleccionado?.name || localStorage.getItem("SectorName") || ""}`,
      expiraEn: Date.now() + 5 * 60 * 1000,
    };
    sessionStorage.setItem("reservaActiva", JSON.stringify(reservaActiva));

    mostrarToast("✅ Reserva exitosa. Tenés 5 minutos para pagar.", "success");
    cancelarSeleccion();
    mostrarWidgetTimer(reservaActiva);
    await cargarAsientos(localStorage.getItem("SectorId"));
  } catch {
    mostrarToast(
      "❌ El asiento ya fue tomado por otro usuario. El mapa fue actualizado.",
      "error",
    );
    await cargarAsientos(localStorage.getItem("SectorId"));
    cancelarSeleccion();
  } finally {
    btn.disabled = false;
    texto.textContent = "Confirmar Reserva";
    spinner.classList.add("hidden");
  }
};

// --- Widget flotante del temporizador ---
function mostrarWidgetTimer(reservaActiva) {
  const widget = document.getElementById("widget-timer");
  document.getElementById("widget-asiento").textContent =
    reservaActiva.seatInfo;

  // CAMBIO: Usamos flex para centrar y quitamos hidden
  widget.classList.remove("hidden");
  widget.classList.add("flex");

  // BLOQUEO: Evita que el usuario scrollee el mapa de asientos mientras paga
  document.body.classList.add("overflow-hidden");

  iniciarCuentaRegresiva(reservaActiva.expiraEn);
}

function iniciarCuentaRegresiva(expiraEn) {
  // 1. Limpiar cualquier intervalo previo
  if (intervaloTemporizador) clearInterval(intervaloTemporizador);

  const display = document.getElementById("widget-countdown");
  const widget = document.getElementById("widget-timer");

  // 2. Definimos la lógica de actualización en una función interna
  const actualizar = () => {
    const ahora = Date.now();
    const restantes = Math.max(0, Math.floor((expiraEn - ahora) / 1000));

    const min = Math.floor(restantes / 60)
      .toString()
      .padStart(2, "0");
    const seg = (restantes % 60).toString().padStart(2, "0");

    if (display) {
      display.textContent = `${min}:${seg}`;

      // Colores según el tiempo restante
      if (restantes <= 60) {
        display.classList.replace("text-indigo-600", "text-red-600");
      } else {
        display.classList.add("text-indigo-600");
        display.classList.remove("text-red-600");
      }
    }

    // Lógica cuando el tiempo llega a cero
    if (restantes <= 0) {
      clearInterval(intervaloTemporizador);

      sessionStorage.removeItem("reservaActiva");

      if (widget) widget.classList.add("hidden");
      document.body.classList.remove("overflow-hidden");

      window.Auth.showToast(
        "⏰ El tiempo expiró. Tu reserva fue liberada.",
        "error",
      );

      const sId = sectorSeleccionado?.id || LocalStorage.getItem("SectorId");
      if (sId) cargarAsientos(sId);
    }
  };

  // 3. EJECUCIÓN INMEDIATA: Actualizamos antes de que pase el primer segundo
  actualizar();

  // 4. Iniciamos el intervalo para los siguientes segundos
  intervaloTemporizador = setInterval(actualizar, 1000);
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

  // --- EL ARREGLO ESTÁ AQUÍ ---
  const widget = document.getElementById("widget-timer");

  // 1. Mostrar información del asiento
  document.getElementById("widget-asiento").textContent =
    reservaActiva.seatInfo;

  // 2. Aplicar clases para centrar (Igual que en mostrarWidgetTimer)
  widget.classList.remove("hidden");
  widget.classList.add("flex");

  // 3. Volver a bloquear el scroll del fondo
  document.body.classList.add("overflow-hidden");

  // 4. Reiniciar el reloj
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
    await API.request(
      `reservations/${reservaActiva.reservationId}/confirm`,
      "PUT",
    );
    clearInterval(intervaloTemporizador);
    sessionStorage.removeItem("reservaActiva");
    document.getElementById("widget-timer").classList.add("hidden");
    mostrarToast("🎉 ¡Pago confirmado! Tu entrada fue comprada.", "success");
    if (sectorSeleccionado)
      await cargarAsientos(localStorage.getItem("SectorId"));
  } catch {
    mostrarToast("❌ Error al confirmar el pago. Intentá de nuevo.", "error");
  } finally {
    btnTexto.textContent = "💳 Confirmar Pago";
    spinner.classList.add("hidden");
  }
};

// --- Cancelar reserva activa ---
window.cancelarReservaActiva = async function () {
  const raw = sessionStorage.getItem("reservaActiva");
  if (!raw) return;

  const { reservationId } = JSON.parse(raw);

  try {
    // Llamamos al endpoint que actualiza el estado
    await API.request(`reservations/${reservationId}/cancel`, "PUT");

    // Si el servidor responde bien, limpiamos la UI
    clearInterval(intervaloTemporizador);
    sessionStorage.removeItem("reservaActiva");
    document.getElementById("widget-timer").classList.add("hidden");
    mostrarToast("Reserva cancelada y asiento liberado.", "success");
    await cargarAsientos(localStorage.getItem("SectorId"));
  } catch (error) {
    mostrarToast("Error al cancelar la reserva.", "error");
  }
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

function obtenerSesion() {
  const raw = sessionStorage.getItem("sesion");
  return raw ? JSON.parse(raw) : null;
}
