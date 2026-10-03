import api from "../../../lib/api";

/* the backend always answers with { message }, surface that instead of axios noise.
   error bodies on a blob request come back as a Blob, so read it before giving up */
async function toError(err) {
  const data = err?.response?.data;

  if (data instanceof Blob) {
    try {
      const { message } = JSON.parse(await data.text());
      if (message) return new Error(message);
    } catch {
      /* not json, fall through */
    }
  }

  return new Error(data?.message || err?.message || "Something went wrong");
}

/**
 * @description Fetch the logged-in user's profile and saved-resume metadata.
 */
export const getProfile = async () => {
  try {
    const response = await api.get("/api/users/profile");
    return response.data;
  } catch (err) {
    throw await toError(err);
  }
};

/**
 * @description Save or replace the resume stored on the user's profile.
 */
export const uploadResume = async (resumeFile) => {
  const formData = new FormData();
  formData.append("resume", resumeFile);

  try {
    const response = await api.put("/api/users/resume", formData);
    return response.data;
  } catch (err) {
    throw await toError(err);
  }
};

/**
 * @description Remove the saved resume from the user's profile.
 */
export const deleteResume = async () => {
  try {
    const response = await api.delete("/api/users/resume");
    return response.data;
  } catch (err) {
    throw await toError(err);
  }
};

/**
 * @description Download the user's saved resume PDF.
 */
export const downloadResume = async () => {
  try {
    const response = await api.get("/api/users/resume", { responseType: "blob" });
    return response.data;
  } catch (err) {
    throw await toError(err);
  }
};

/**
 * @description Change the logged-in user's email. Requires the current password.
 */
export const updateEmail = async ({ newEmail, currentPassword }) => {
  try {
    const response = await api.put("/api/users/email", { newEmail, currentPassword });
    return response.data;
  } catch (err) {
    throw await toError(err);
  }
};

/**
 * @description Change the logged-in user's password. Requires the current password.
 */
export const updatePassword = async ({ currentPassword, newPassword }) => {
  try {
    const response = await api.put("/api/users/password", { currentPassword, newPassword });
    return response.data;
  } catch (err) {
    throw await toError(err);
  }
};
