# CV Slayer

CV Slayer compares a resume with a job description and explains the alignment using explicit evidence. It identifies strong matches, partial/unclear matches, missing requirements, score components, and next-step recommendations.

## Features

- PDF and DOCX resume upload with MIME and 5 MB limits.
- Deterministic resume/JD extraction and skill normalization (`React.js` -> `React`, `Mongo` -> `MongoDB`, `JS` -> `JavaScript`).
- Evidence-based matching. Missing skills are reported as **not clearly present**, never inferred as owned.
- Configurable weighted compatibility score for required skills, preferred skills, experience, keywords, and education.
- Optional server-side Gemini explanation and recommendation layer with deterministic fallback.
- Persisted resumes and analyses for authenticated users.
- Demo analysis endpoint for presentations without an account.
- Socket.io event emitted after a persisted analysis is created.
- Responsive SaaS dashboard with score visualization, skill chips, chart, evidence rows, loading states, and actionable errors.

## Architecture

```text
React/Vite dashboard
        |
        | multipart upload / JSON
        v
Express API + security middleware
        |
        +--> documentParser (PDF/DOCX)
        +--> extractionService (resume/JD profiles)
        +--> skillCatalog (normalization)
        +--> matchingService (evidence comparison)
        +--> scoringService (deterministic weighted score)
        +--> aiService (optional Gemini explanations)
        +--> Mongoose (Resume, Analysis, User)
```

### Folder structure

- `src/`: React dashboard and visual system.
- `server/index.js`: Express, Helmet, CORS, rate limiting, Socket.io, and error handling.
- `server/routes/`: auth, history/metrics, and analysis endpoints.
- `server/services/`: document parsing, extraction, normalization, matching, scoring, and AI.
- `server/models/`: Mongoose User, Resume, and Analysis schemas.
- `server/validators/`: Zod request schemas.
- `test/`: Node test runner coverage for normalization, matching, evidence, and score bounds.

## Stack

React 19, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide, Express 5, MongoDB/Mongoose, Multer, PDF Parse, Mammoth, Socket.io, JWT, Helmet, express-rate-limit, Zod, and Gemini SDK.

## Local setup

```powershell
npm install
Copy-Item .env.example .env
npm run dev:full
```

The frontend runs on `http://localhost:5173`. The API runs on `http://localhost:4000`. MongoDB is required for registration, authenticated uploads, and persistence. The demo endpoint works without MongoDB.

Useful commands:

```powershell
npm run dev          # frontend
npm run server:dev   # API with nodemon
npm run dev:full     # both
npm run build        # production frontend build
npm run lint         # Oxlint
npm test             # matching service tests
```

## Environment variables

Copy `.env.example` to `.env` and set:

- `MONGODB_URI`: MongoDB connection string.
- `JWT_SECRET`: long random secret; required for auth.
- `PORT`: API port, default `4000`.
- `CLIENT_URL`: allowed frontend origin. Localhost origins are allowed during development; production uses this configured origin.
- `VITE_API_URL`: production frontend build's API origin. Leave blank for local development, where Vite proxies requests to the local API.
- `GEMINI_API_KEY`: optional server-only Gemini key.
- `GEMINI_MODEL`: optional model name.
- `SCORING_WEIGHTS_JSON`: optional JSON object overriding score weights.

Never put Gemini keys, JWT secrets, or MongoDB credentials in `src/` or commit them.

For deployment, set `VITE_API_URL` on the frontend host to the deployed API origin, and set `CLIENT_URL` plus `NODE_ENV=production` on the API host. `CLIENT_URL` is normalized to its origin, so a trailing slash is okay. The frontend uses `VITE_API_URL` only in production builds; development requests use the Vite proxy (`API_PROXY_TARGET`, or `localhost` with the API `PORT`). Keep `.env.local` out of Git and configure these variables in the hosting dashboards because ignored local env files are not uploaded during deployment.

## API

Public:

- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/analyze/demo`

Authenticated with the HTTP-only `access_token` cookie:

- `GET /api/auth/me`
- `POST /api/analyze` with multipart fields `resume`, `roleTitle`, `company`, and `jobDescription`.
- `GET /api/analyses?search=&status=&sort=`
- `GET /api/analyses/:id`
- `GET /api/analyses/metrics`
- `DELETE /api/analyses/:id`

The server calculates the score after extraction and matching. Clients cannot submit a trusted score.

## AI behavior

Gemini is isolated in `server/services/aiService.js` and only receives structured profiles/comparison data. Its output is parsed and constrained to a summary plus recommendations. Invalid JSON, rate limits, missing keys, timeouts, and provider errors fall back to deterministic explanations. Gemini never writes to MongoDB and never determines the final score.

## Security

- HTTP-only, same-site auth cookie.
- Password hashing with bcrypt.
- Helmet security headers and CORS origin restriction.
- API rate limiting.
- Multer memory upload with MIME, extension, file-count, and size validation.
- Zod validation for analysis metadata.
- Escaped search expressions and allow-listed sort fields.
- Sanitized error responses without stack traces or resume contents.
- Resume raw text is used for matching but is not persisted in the Analysis profile.

## Deployment

Build the frontend with `npm run build` and serve `dist/` from a static host. Deploy the Node API as a separate service with the same environment variables and a production MongoDB connection. Set `CLIENT_URL` to the deployed frontend origin, use HTTPS, and set `NODE_ENV=production` so auth cookies are secure. Configure the Gemini key only in the backend deployment secret store.


## Test the Demo

1. Open the Overview page.
2. Click **Try demo**.
3. Confirm the score, matched skills, missing skills, and evidence appear.
4. Open **Insights** and confirm saved-account metrics are shown when logged in.

## Test Authentication

1. Click **Sign in** from My analyses or Settings.
2. Choose **Create a new account**.
3. Enter a name, valid email, and password with at least 8 characters.
4. Confirm registration succeeds.
5. Open Settings and confirm the user name and email appear.
6. Open My analyses and confirm the protected page loads.
7. Sign out and confirm saved data is no longer visible.

## Test Resume Analysis

1. Sign in.
2. Return to Overview.
3. Upload a PDF or DOCX resume.
4. Paste a job description containing required and preferred skills.
5. Click **Analyze my match**.
6. Confirm the UI shows:
   - Compatibility score
   - Required coverage
   - Matched skills
   - Missing skills
   - Evidence text
   - Recommendations when available
7. Open My analyses and confirm the report is saved.
8. Open the report, then test Delete.

## Test Error Handling

- Upload an unsupported file type.
- Upload a file larger than 5 MB.
- Submit an empty or very short job description.
- Try a private analysis while signed out.
- Try an incorrect password.
- Visit an unknown route and confirm it redirects to Overview.

## Current limitations

Resume parsing is intentionally conservative and text-based. Scanned/image-only PDFs need OCR before they can be analyzed. The core P0 comparison path is implemented; resume rewriting, interview generation, PDF report export, and version diffing remain follow-up product modules rather than mocked as complete features.
