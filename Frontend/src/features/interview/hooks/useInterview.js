import {
  getAllInterviewReports,
  generateInterviewReport,
  getInterviewReportById,
  deleteInterviewReport,
  generateResumePdf,
} from "../services/interview.api";
import { useContext, useEffect } from "react";
import { InterviewContext } from "../interview.context";
import { useParams } from "react-router";

export const useInterview = () => {
  const context = useContext(InterviewContext);
  const { interviewId } = useParams();

  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }

  const {
    loading,
    setLoading,
    error,
    setError,
    report,
    setReport,
    reports,
    setReports,
  } = context;

  /* every one of these resolves to the data on success and to null on failure,
     the error itself is kept on the context so a page can render it */
  const generateReport = async ({
    jobDescription,
    selfDescription,
    resumeFile,
  }) => {
    setLoading(true);
    setError(null);
    try {
      const response = await generateInterviewReport({
        jobDescription,
        selfDescription,
        resumeFile,
      });
      setReport(response.interviewReport);
      return response.interviewReport;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getReportById = async (id) => {
    setLoading(true);
    setError(null);
    try {
      const response = await getInterviewReportById(id);
      setReport(response.interviewReport);
      return response.interviewReport;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllInterviewReports();
      setReports(response.interviewReports);
      return response.interviewReports;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  const deleteReport = async (interviewId) => {
    try {
      await deleteInterviewReport(interviewId);
      setReports((prev) => prev.filter((r) => r._id !== interviewId));
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  };

  const getResumePdf = async (interviewReportId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await generateResumePdf({ interviewReportId });
      const url = window.URL.createObjectURL(
        new Blob([response], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `resume_${interviewReportId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      /* deferred, revoking straight after the click can cancel the download */
      setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* the single fetch for this feature, pages must not repeat it in their own effect */
  useEffect(() => {
    if (interviewId) {
      getReportById(interviewId);
    } else {
      getReports();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interviewId]);

  return {
    loading,
    error,
    report,
    reports,
    generateReport,
    getReportById,
    getReports,
    deleteReport,
    getResumePdf,
  };
};
