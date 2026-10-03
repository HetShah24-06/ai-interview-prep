import api from "../../../lib/api";

/* the backend always answers with { message }, surface that instead of axios noise */
function toError(err) {
  return new Error(
    err?.response?.data?.message || err?.message || "Something went wrong",
  );
}

export async function register({ username, email, password }) {
  try {
    const response = await api.post("/api/auth/register", {
      username,
      email,
      password,
    });

    return response.data;
  } catch (err) {
    throw toError(err);
  }
}

export async function login({ email, password }) {
  try {
    const response = await api.post("/api/auth/login", {
      email,
      password,
    });

    return response.data;
  } catch (err) {
    throw toError(err);
  }
}

export async function logout() {
  try {
    const response = await api.get("/api/auth/logout");

    return response.data;
  } catch (err) {
    throw toError(err);
  }
}

export async function getMe() {
  try {
    const response = await api.get("/api/auth/get-me");

    return response.data;
  } catch (err) {
    throw toError(err);
  }
}
