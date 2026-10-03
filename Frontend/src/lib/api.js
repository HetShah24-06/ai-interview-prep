import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
});

/* double-submit CSRF guard. The backend also sets this as a cookie, but the
   frontend can't rely on reading it via document.cookie: in production the
   frontend (Vercel) and backend (Render) are on different domains, and a
   cookie set by one origin is invisible to JS running on another origin,
   even a non-httpOnly one. So instead the backend hands the current value
   back in the JSON body of register/login/get-me, and the frontend holds
   it here in memory and echoes it back as a header on every mutating
   request. See Backend/src/controllers/auth.controller.js (issueSession). */
let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token || null;
}

api.interceptors.request.use((config) => {
  if ((config.method || "get").toUpperCase() !== "GET" && csrfToken) {
    config.headers["X-CSRF-Token"] = csrfToken;
  }
  return config;
});

export default api;
