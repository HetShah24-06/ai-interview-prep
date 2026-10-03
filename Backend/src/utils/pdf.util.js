const pdfParse = require("pdf-parse");

/**
 * @description Extracts plain text from a PDF buffer. Throws an "expose"-able
 * error with a user-facing message if the file isn't a parsable PDF, instead
 * of surfacing pdf-parse's internal error as a raw 500.
 */
/**
 * @description The Multer fileFilter only sees the multipart Content-Type
 * header, which the client fully controls and can lie about. This checks
 * the actual file signature ("%PDF-") that every real PDF starts with.
 */
function isPdfSignature(buffer) {
  return buffer.length >= 5 && buffer.subarray(0, 5).toString("latin1") === "%PDF-";
}

async function extractPdfText(buffer) {
  if (!isPdfSignature(buffer)) {
    const error = new Error("The uploaded file is not a valid PDF.");
    error.status = 400;
    error.expose = true;
    throw error;
  }

  try {
    const parsed = await new pdfParse.PDFParse(Uint8Array.from(buffer)).getText();
    return parsed.text;
  } catch {
    const error = new Error("Could not read the uploaded PDF. Please upload a valid, non-corrupted PDF file.");
    error.status = 400;
    error.expose = true;
    throw error;
  }
}

module.exports = { extractPdfText };
