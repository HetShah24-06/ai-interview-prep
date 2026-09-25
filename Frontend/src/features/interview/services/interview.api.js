import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
  withCredentials: true,
});

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
 * @description Service to generate interview report based on user self description, resume and job description.
 */
export const generateInterviewReport = async ({
  jobDescription,
  selfDescription,
  resumeFile,
}) => {
  const formData = new FormData();
  formData.append("jobDescription", jobDescription);
  formData.append("selfDescription", selfDescription);

  /* the resume is optional, appending undefined would post the string "undefined" */
  if (resumeFile) {
    formData.append("resume", resumeFile);
  }

  try {
    const response = await api.post("/api/interview/", formData);

    return response.data;
  } catch (err) {
    throw await toError(err);
  }
};

/**
 * @description Service to get interview report by interviewId.
 */
export const getInterviewReportById = async (interviewId) => {
  try {
    const response = await api.get(`/api/interview/report/${interviewId}`);

    return response.data;
  } catch (err) {
    throw await toError(err);
  }
};

/**
 * @description Service to get all interview reports of logged in user.
 */
export const getAllInterviewReports = async () => {
  try {
    const response = await api.get("/api/interview/");

    return response.data;
  } catch (err) {
    throw await toError(err);
  }
};

/**
 * @description Service to generate resume pdf based on user self description, resume content and job description.
 */
export const generateResumePdf = async ({ interviewReportId }) => {
  try {
    const response = await api.post(
      `/api/interview/resume/pdf/${interviewReportId}`,
      null,
      {
        responseType: "blob",
      },
    );

    return response.data;
  } catch (err) {
    throw await toError(err);
  }
};
