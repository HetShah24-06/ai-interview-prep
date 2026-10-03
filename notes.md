# Interview Master — Project Notes

## What this project is

An AI-powered interview prep tool. A logged-in user pastes a target job
description and either uploads a resume (PDF) or writes a quick
self-description. Gemini compares the two and generates a structured report:
a match score, likely technical and behavioral questions (each with the
interviewer's intention and a model answer), a list of skill gaps by
severity, and a day-by-day preparation roadmap. The user can also generate
a tailored, ATS-friendly resume PDF for that specific job from the same
report.

**Elevator pitch:** "It's a full-stack app where you paste a job description
and your background, and an LLM gives you back a personalized mock-interview
pack and a matching resume — with structured, schema-validated AI output
instead of free-text."

## Tech stack

- **Backend:** Node.js, Express 5, MongoDB (Mongoose, Atlas-hosted), JWT
  auth in httpOnly cookies, bcrypt for password hashing.
- **AI:** `@google/genai` (Gemini `gemini-3-flash-preview`), with `zod` +
  `zod-to-json-schema` to force the model's response into a strict JSON
  schema (report shape, resume-HTML shape) instead of parsing free text.
- **PDF generation:** Gemini writes resume HTML, Puppeteer renders it to a
  PDF server-side (`page.pdf()`), streamed back as `application/pdf`.
- **Resume parsing:** `pdf-parse` extracts text from an uploaded PDF before
  it's sent to Gemini as context.
- **Frontend:** React 19, React Router 7 (data router), Axios, Sass (BEM-ish
  class names, no component library — hand-built dark UI).
- **File uploads:** Multer, in-memory storage, 3MB limit, PDF-only filter.

## How the core flows work

**Auth:** register/login issue a JWT (`{ id, username }`, 1-day expiry) set
as an httpOnly cookie. `authUser` middleware reads that cookie, checks it
against a `blacklistTokens` collection (Mongo TTL index auto-expires entries
after 1 day) before verifying the signature. Logout doesn't just clear the
cookie — it blacklists the token so a copied/stolen cookie stops working
immediately instead of staying valid until natural expiry. `AuthProvider`
calls `/api/auth/get-me` once on app load to restore the session; `Protected`
redirects to `/login` if that comes back empty.

**Interview generation:** `POST /api/interview/` takes multipart form data
(jobDescription, optional selfDescription, optional resume file). If a
resume was uploaded, its text is extracted server-side with `pdf-parse`
before hitting Gemini — the raw PDF bytes never go to the model. Gemini's
response is constrained to a Zod-derived JSON schema so `matchScore`,
`technicalQuestions`, `behavioralQuestions`, `skillGaps`, and
`preparationPlan` always arrive in a predictable shape, then the whole thing
is saved as one `InterviewReport` document tied to `req.user.id`.

**Resume PDF:** re-uses the saved report's job description / resume /
self-description, asks Gemini for a tailored resume as HTML, renders it with
a headless Chromium instance via Puppeteer, and streams the PDF back with a
`Content-Disposition: attachment` header.

## Status as of 2026-09-25

Ran the full stack end-to-end (both servers launched, hit every API route
with curl, and drove the actual UI in a real headless browser) rather than
just reading the code. Everything works:

- Register → login → logout → blacklist → get-me: all correct status codes
  and messages, blacklisted tokens are actually rejected on reuse.
- Interview generation against the live Gemini API: real 72% match score,
  3 well-formed technical questions with intention + model answer.
- Resume PDF generation: valid 2-page PDF, correct content-type.
- Full UI walk-through: unauthenticated redirect to `/login`, register form,
  home page with the generated plan listed, and the interview report page
  (question accordions, match-score ring, skill-gap chips) all render
  correctly with no console errors.

Test accounts/data created during this session (`smoke924@example.com`,
`ui924@example.com`, one interview report) were deleted from the Atlas
cluster afterward — the DB now only has real data.

## Fixed on 2026-09-25

All of the gaps below (previously items 1–7) are now closed:

- **Root `README.md`** added — overview, screenshots, tech stack, setup
  instructions, API table, deployment notes.
- **`.env.example`** added for both `Backend/` and `Frontend/`.
- **Frontend API base URL** now reads `import.meta.env.VITE_API_URL`
  (falls back to `http://localhost:3000` for local dev) in both
  `auth.api.js` and `interview.api.js` — the frontend can now point at a
  deployed backend without a code change.
- **Navbar with a working logout button** added (`Navbar.jsx`), wired into
  `Protected` so it appears on every authenticated page (Home, Interview).
  Logout calls the real `/api/auth/logout` endpoint (blacklists the token,
  not just a client-side cookie clear) and redirects to `/login`.
- **Request validation** added via Zod schemas (`src/validators/auth.validator.js`):
  register now rejects short usernames, malformed emails, and passwords
  under 6 characters; login rejects malformed emails.
- **Backend test suite** added: Jest + Supertest, 17 tests across
  `tests/auth.test.js` and `tests/interview.test.js` (register/login/
  logout/blacklist/get-me, plus interview-report generation, listing, and
  fetch-by-id, with the AI service and DB models mocked). Run with
  `npm test` from `Backend/`.
- **Rate limiting** added on `/api/auth/login` and `/api/auth/register`
  (20 requests / 15 min per IP, via `express-rate-limit`).
- **Puppeteer launch args** updated (`--no-sandbox`, `--disable-setuid-sandbox`)
  so resume-PDF generation doesn't crash on containerized hosts (Render,
  Railway, Docker) where the default Chromium sandbox has no permission to
  create user namespaces.

## Remaining gaps

1. **Puppeteer + serverless hosts still don't mix.** The sandbox fix above
   makes it work on a host with real Chromium (a VM, a Docker container).
   Serverless platforms (Vercel functions, AWS Lambda) still need
   `@sparticuz/chromium` instead of full Puppeteer — only relevant if that's
   the hosting choice.
2. **Secrets exposure:** `Backend/.env` (Mongo URI with password, JWT
   secret, Gemini key) is correctly gitignored, but since this folder lives
   in OneDrive it's already syncing to the cloud, and the raw values were
   printed to this chat session during testing. Rotate the Mongo password
   and Gemini key before making the repo public — this requires the
   respective account dashboards, so it's on you, not something fixable
   from the code.
3. **Not actually deployed yet.** Code is deploy-ready (env-driven config,
   `NODE_ENV`-conditional cookie settings, CORS via `CLIENT_URL`), but no
   live URL exists yet.

## Is this ready to commit to GitHub / deploy / use as the primary portfolio project?

**To commit to GitHub:** yes — rotate the two secrets above first, then
`git init`, commit, push. `.env` is already gitignored on both ends.

**To deploy:** yes. Backend + MongoDB Atlas (already on Atlas) on
Render/Railway, frontend on Vercel/Netlify. Set `CLIENT_URL` (backend),
`VITE_API_URL` (frontend), and `NODE_ENV=production` (backend) on the
hosts. Confirm the resume-PDF route on whatever host you pick, since it's
the one feature with a real infra dependency (Chromium).

**As your primary project to explain in interviews:** solid now. Real auth
with token blacklisting, schema-constrained LLM output, a genuine
multi-step pipeline, a working test suite, and a README that actually
explains the project — that combination is well above the average
portfolio CRUD app. The functional/polish gaps that used to be visible in
the first two minutes of opening the repo are closed; what's left
(deploying, rotating secrets) isn't code work.

---

## Dev log

**Day 1, 1:16 PM** — Backend: APIs created for register, login, logout,
token blacklisting, get-me.

**Day 1, 1:31 PM** — Frontend: pages folder structured, login and register
pages built with base styling.

**2026-09-25** — Verified the full stack end-to-end (see "Status" above),
cleaned up test data from the Atlas cluster, documented the project
properly here.

**2026-09-25 (later)** — Closed out the portfolio-readiness gaps: root
README with screenshots, `.env.example` files, env-driven API URL, a
navbar with working logout, Zod request validation, a 17-test Jest/Supertest
suite, auth rate limiting, and a Puppeteer sandbox fix for deployment. See
"Fixed on 2026-09-25" above for details.

**2026-10-02/03** — Added profile-based resume storage, a dedicated home
button on the interview page, and several flow/security/productivity
improvements:

- **Saved resumes** (`User.resumeFile` / `resumeFileName` / `resumeText`,
  all `select: false` by default): `GET/PUT/DELETE /api/users/resume` plus
  `GET /api/users/profile`. A new `/profile` page (`Frontend/src/features/profile/`)
  lets a user upload once, then download, replace, or remove it. Report
  generation (`generateInterViewReportController`) now falls back to the
  saved resume automatically when a request has neither a file nor a self
  description — tested live end-to-end (upload → generate with nothing but
  a job description → correct AI output using the saved resume's content).
- **Home button** on the interview report page (`Interview.jsx` sidebar,
  above "Sections") — was previously only reachable via the navbar brand
  link, which wasn't obvious as navigation.
- **Delete report** — `DELETE /api/interview/report/:id` plus a delete (×)
  button on each card in the "My Recent Interview Plans" list, with a
  confirm prompt.
- **Security hardening:** `helmet` added to the Express app; a second,
  tighter rate limiter (15/hour/IP) on `POST /api/interview/` since each
  call is a paid Gemini request, separate from the 20/15min auth limiter;
  server-side length caps on job description (5000 chars) and self
  description (2000 chars) to match/enforce what the frontend already
  caps client-side; PDF parsing failures now return a clean 400 ("Could
  not read the uploaded PDF...") via a shared `utils/pdf.util.js` helper
  instead of an unhandled 500.
- Test suite grew from 17 to 25 tests (`tests/user.test.js` added,
  `tests/interview.test.js` extended for the saved-resume fallback path).
- README and screenshots updated to reflect the profile feature.

Gave the user a list of further suggestions not yet implemented (see
below) — CSRF protection, refresh tokens / "remember me", forgot-password
flow, account settings (change password/email), pagination, PDF magic-byte
validation beyond mimetype, progress indicator during the ~10s generation
call, and light/dark theme toggle.

**2026-10-02/03 (later)** — User asked for "everything, in order": the
security items, then the UX items, from the list above.

- **CSRF protection** (`Backend/src/middlewares/csrf.middleware.js`):
  double-submit cookie pattern. Register/login now also issue a
  non-httpOnly `csrfToken` cookie via a shared `issueSession()` helper in
  `auth.controller.js`; every mutating route except register/login
  requires that value echoed back as an `X-CSRF-Token` header, verified
  with a plain equality check (no server-side storage needed — a
  cross-site request can carry the victim's cookie automatically but
  can't read it to set a matching header). Frontend: three separate
  `axios.create()` calls (one each in auth/interview/profile `*.api.js`)
  were consolidated into one shared instance at `Frontend/src/lib/api.js`
  with a request interceptor that reads the cookie and attaches the
  header on every non-GET request — this was also a DRY cleanup, not just
  a security change. Verified live with curl: missing header → 403,
  wrong value → 403, correct value → request proceeds.
- **PDF magic-byte validation** (`Backend/src/utils/pdf.util.js`): checks
  the first 5 bytes for the real `%PDF-` file signature before attempting
  to parse, independent of multer's `fileFilter` (which only ever sees the
  client-controlled `Content-Type` header, not file content — Multer
  doesn't expose the buffer to `fileFilter` at all, so the check has to
  happen after upload, in the shared PDF util both controllers call).
  Verified a non-PDF file renamed with a `.pdf` extension and spoofed
  mimetype is now rejected with 400 instead of silently failing later
  inside pdf-parse.
- **Account settings** — `PUT /api/users/email` and `PUT /api/users/password`,
  both requiring the current password (checked via bcrypt) before
  applying the change, both CSRF-protected and auth-rate-limited. Profile
  page gained inline "Change Email" / "Change Password" forms. Verified
  live: wrong current password rejected, correct one applied, and login
  with the new email+password succeeds while the old password no longer
  works.
- **Progress indicator during generation:** Home.jsx now tracks a local
  `isGenerating` state (separate from the interview hook's shared
  `loading`, which is also used for the initial report-list fetch — reusing
  one flag for both was going to show the wrong message on first page
  load). While generating, a rotating set of five status messages
  ("Analyzing the job description...", "Comparing it with your
  background...", etc.) cycles every 2.2s alongside a spinner and a
  progress bar tied to step index, not real server progress (no
  SSE/WebSocket plumbing was introduced — this is a perceived-progress UI
  over the existing single request/response call).
- **Light/dark theme toggle:** `Frontend/src/style/theme.scss` defines the
  palette as CSS custom properties on `:root` (dark) and
  `:root[data-theme="light"]`; `theme/theme.context.jsx` toggles the
  `data-theme` attribute and persists the choice to `localStorage`; a
  sun/moon button in the navbar flips it instantly everywhere via the
  cascade. The existing SCSS files each had their own local `$bg-page` /
  `$border-color` / etc. Sass variables (three separate copies of nearly
  the same palette, pre-existing duplication) — these were repointed to
  `var(--...)` so only the top variable block in each file needed editing,
  not every usage site. Accent/brand/severity colors were deliberately
  left as real Sass hex values rather than `var()`, both because they're
  fed through Sass's `rgba()`/`lighten()`/`darken()` (which need an actual
  color to read channels from, not a `var()` string — this broke the build
  twice before landing on this split) and because a brand color staying
  constant across themes is normal design practice, only the neutrals
  need to flip.
- Test suite grew from 25 to 41 tests covering CSRF (missing/wrong/correct
  token on every protected route), the magic-byte rejection, and the new
  email/password endpoints.
- README gained a "Security" section documenting the auth/CSRF/upload/
  rate-limit posture.

All implemented, tested live (curl + a real headless-browser pass through
register → theme toggle → generate → light-mode report → profile forms),
and all test data cleaned from the Atlas cluster afterward.

**2026-10-03** — Deployed the full stack. Frontend on Vercel (CLI was
already authenticated on this machine under the user's account), backend
on Render via the Dockerfile/render.yaml prepared the day before. One real
hiccup along the way: Atlas rejected Render's connection
(`MongooseServerSelectionError` / `ReplicaSetNoPrimary`) until Network
Access was opened to `0.0.0.0/0` — Render's free tier has no static
egress IP, so an IP allowlist doesn't work there, this is expected and the
right call for this plan (not a workaround, the actual correct config).
After that, `Connected to MongoDB` / `Server is running on port 10000`
(Render assigns its own `PORT`, picked up correctly via
`process.env.PORT`). Wired `VITE_API_URL` into Vercel's production env
and redeployed. Verified the real production stack end-to-end in a
headless browser against the live URLs: CORS preflight correct
(`access-control-allow-origin` matches the Vercel origin,
`allow-credentials: true`), register → 201, and both
`/api/interview/` and `/api/users/profile` returned 200 — which only
works if the cross-site `SameSite=None; Secure` cookies are actually
round-tripping between the two different domains, so this is real proof
the production auth flow works, not just that the pages loaded. Test
account deleted from Atlas afterward.

**Live demo:** https://interview-master-ebon.vercel.app
**API:** https://interview-master-backend-wf4c.onrender.com

The project is now fully built, tested, documented, and deployed. The one
item never explicitly confirmed: whether the user actually rotated the
Mongo password / Gemini key (recommended multiple times since the raw
values were printed into chat sessions) rather than reusing the original
ones when filling in Render's env vars — worth checking next time this
comes up rather than assuming either way.
