/**
 * @description Double-submit-cookie CSRF guard. The csrfToken cookie is
 * readable by frontend JS (unlike the httpOnly auth token) and must be
 * echoed back in the X-CSRF-Token header on every mutating request. A
 * cross-site form or <img> trigger can send the cookie automatically but
 * can't read it to set a matching header, so a mismatch means the request
 * didn't originate from the app itself.
 */
function csrfProtection(req, res, next) {
  const cookieToken = req.cookies.csrfToken;
  const headerToken = req.headers["x-csrf-token"];

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ message: "Invalid or missing CSRF token." });
  }

  next();
}

module.exports = { csrfProtection };
