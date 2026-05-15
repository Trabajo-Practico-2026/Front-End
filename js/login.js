// login.js
import { API } from "./api.js";

// 1. Inyección de HTML
document.body.insertAdjacentHTML(
  "beforeend",
  `
  <div id="toast-container" class="fixed bottom-5 right-5 z-[110] flex flex-col gap-3"></div>
  <div id="modal-login" class="hidden fixed inset-0 bg-slate-900 bg-opacity-95 flex items-center justify-center z-[100]">
    <div class="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md mx-4 text-center">
      <h2 class="text-2xl font-bold text-slate-800 mb-2">TicketUNAJ</h2>
      <p class="text-slate-500 mb-6">Ingresá tu User ID para continuar</p>
      <input type="number" id="login-userid" class="w-full border border-slate-200 rounded-xl px-4 py-3 mb-4 text-lg focus:ring-2 focus:ring-indigo-500 outline-none transition" placeholder="Ej: 12345" />
      <button id="btn-confirmar-login" class="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition-all font-bold text-lg">
        Entrar al Sistema
      </button>
    </div>
  </div>
`,
);

// 2. Definimos Auth y lo asignamos a window
window.Auth = {
  key: "sesion",

  obtenerSesion() {
    return JSON.parse(sessionStorage.getItem(this.key));
  },

  mostrarModal() {
    document.getElementById("modal-login").classList.remove("hidden");
  },

  ocultarModal() {
    document.getElementById("modal-login").classList.add("hidden");
  },

  // Cierra la sesión: borra el storage y recarga la página
  cerrarSesion() {
    sessionStorage.removeItem(this.key);
    sessionStorage.removeItem("reservaActiva");
    location.reload();
  },

  actualizarUI() {
    const sesion = this.obtenerSesion();
    document.querySelectorAll("#header-usuario").forEach((el) => {
      if (sesion) {
        // Muestra el nombre + botón de cerrar sesión
        el.innerHTML = `
          <span class="text-sm text-slate-600">👤 ${sesion.nombre}</span>
          <button
            onclick="window.Auth.cerrarSesion()"
            class="ml-2 text-xs text-red-500 hover:text-red-700 border border-red-200 hover:border-red-400 px-2 py-1 rounded-lg transition"
          >
            Cerrar sesión
          </button>
        `;
        el.classList.remove("hidden");
      }
    });
  },

  showToast(mensaje, tipo = "success") {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    const bgColor = tipo === "success" ? "bg-green-600" : "bg-red-600";
    toast.className = `${bgColor} text-white px-6 py-3 rounded-xl shadow-lg transition-all duration-300 translate-y-10 opacity-0 flex items-center gap-2 font-medium`;
    toast.innerHTML = `<span>${tipo === "success" ? "✅" : "❌"}</span><span>${mensaje}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove("translate-y-10", "opacity-0"), 10);
    setTimeout(() => {
      toast.classList.add("opacity-0");
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },
};

// 3. Lógica de inicialización
const iniciar = () => {
  const sesionActiva = window.Auth.obtenerSesion();
  if (!sesionActiva) {
    window.Auth.mostrarModal();
  }
  window.Auth.actualizarUI();

  document
    .getElementById("btn-confirmar-login")
    .addEventListener("click", async () => {
      const id = document.getElementById("login-userid").value;
      if (!id) return window.Auth.showToast("Ingresá un ID", "error");

      try {
        const usuario = await API.request(`users/${id}`);
        sessionStorage.setItem(
          window.Auth.key,
          JSON.stringify({
            userId: id,
            nombre: usuario.name,
          }),
        );

        window.Auth.ocultarModal();
        window.Auth.actualizarUI();
        location.reload();
      } catch (e) {
        if (e.status === 404) {
          window.Auth.showToast("ID de usuario no válido", "error");
        } else {
          window.Auth.showToast("Usuario no encontrado", "error");
        }
      }
    });
};

// Ejecutar cuando el DOM esté listo
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", iniciar);
} else {
  iniciar();
}
