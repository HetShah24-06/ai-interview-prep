import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
});

function readCookie(name) {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/* double-submit CSRF guard: the backend reads this back from the header
   and compares it to the (non-httpOnly) csrfToken cookie it issued on
   login/register, see Backend/src/middlewares/csrf.middleware.js */
api.interceptors.request.use((config) => {
  if ((config.method || "get").toUpperCase() !== "GET") {
    const csrfToken = readCookie("csrfToken");
    if (csrfToken) {
      config.headers["X-CSRF-Token"] = csrfToken;
    }
  }
  return config;
});

export default api;
