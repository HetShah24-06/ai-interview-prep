const {
  generateInterviewReport,
  generateResumePdf,
} = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");
const userModel = require("../models/user.model");
const { extractPdfText } = require("../utils/pdf.util");

const JOB_DESCRIPTION_MAX_LENGTH = 5000;
const SELF_DESCRIPTION_MAX_LENGTH = 2000;

/**
 * @description Controller to generate interview report based on user self description, resume and job description.
 */
async function generateInterViewReportController(req, res) {
  const { selfDescription, jobDescription } = req.body;

  if (!jobDescription) {
    return res.status(400).json({
      message: "Job description is required.",
    });
  }

  if (jobDescription.length > JOB_DESCRIPTION_MAX_LENGTH) {
    return res.status(400).json({
      message: `Job description must be under ${JOB_DESCRIPTION_MAX_LENGTH} characters.`,
    });
  }

  if (selfDescription && selfDescription.length > SELF_DESCRIPTION_MAX_LENGTH) {
    return res.status(400).json({
      message: `Self description must be under ${SELF_DESCRIPTION_MAX_LENGTH} characters.`,
    });
  }

  let resumeText = "";

  if (req.file) {
    resumeText = await extractPdfText(req.file.buffer);
  } else if (!selfDescription) {
    /* no file on this request and no self description, fall back to the
       resume saved on the user's profile before giving up */
    const user = await userModel.findById(req.user.id).select("+resumeText");
    resumeText = user?.resumeText || "";
  }

  if (!resumeText && !selfDescription) {
    return res.status(400).json({
      message:
        "Please provide either a resume or a self description, or save a resume to your profile.",
    });
  }

  const interViewReportByAi = await generateInterviewReport({
    resume: resumeText,
    selfDescription,
    jobDescription,
  });

  const interviewReport = await interviewReportModel.create({
    user: req.user.id,
    resume: resumeText,
    selfDescription,
    jobDescription,
    ...interViewReportByAi,
  });

  res.status(201).json({
    message: "Interview report generated successfully.",
    interviewReport,
  });
}

/**
 * @description Controller to get interview report by interviewId.
 */
async function getInterviewReportByIdController(req, res) {
  const { interviewId } = req.params;

  const interviewReport = await interviewReportModel.findOne({
    _id: interviewId,
    user: req.user.id,
  });

  if (!interviewReport) {
    return res.status(404).json({
      message: "Interview report not found.",
    });
  }

  res.status(200).json({
    message: "Interview report fetched successfully.",
    interviewReport,
  });
}

/**
 * @description Controller to get all interview reports of logged in user.
 */
async function getAllInterviewReportsController(req, res) {
  const interviewReports = await interviewReportModel
    .find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .select(
      "-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan",
    );

  res.status(200).json({
    message: "Interview reports fetched successfully.",
    interviewReports,
  });
}

/**
 * @description Controller to delete an interview report belonging to the logged-in user.
 */
async function deleteInterviewReportController(req, res) {
  const { interviewId } = req.params;

  const interviewReport = await interviewReportModel.findOneAndDelete({
    _id: interviewId,
    user: req.user.id,
  });

  if (!interviewReport) {
    return res.status(404).json({
      message: "Interview report not found.",
    });
  }

  res.status(200).json({
    message: "Interview report deleted successfully.",
  });
}

/**
 * @description Controller to generate resume PDF based on user self description, resume and job description.
 */
async function generateResumePdfController(req, res) {
  const { interviewReportId } = req.params;

  const interviewReport = await interviewReportModel.findOne({
    _id: interviewReportId,
    user: req.user.id,
  });

  if (!interviewReport) {
    return res.status(404).json({
      message: "Interview report not found.",
    });
  }

  const { resume, jobDescription, selfDescription } = interviewReport;

  const pdfBuffer = await generateResumePdf({
    resume,
    jobDescription,
    selfDescription,
  });

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
  });

  res.send(pdfBuffer);
}

module.exports = {
  generateInterViewReportController,
  getInterviewReportByIdController,
  getAllInterviewReportsController,
  deleteInterviewReportController,
  generateResumePdfController,
};
