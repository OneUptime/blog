# Validation Summary: How to Use Agenda.js with MongoDB for Job Scheduling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Agenda.js (v5)
- MongoDB
- Node.js
- Nodemailer (referenced)
- Mongoose (referenced)

## Sources Consulted
- Agenda.js v5 GitHub README and source code (https://github.com/agenda/agenda/tree/v5)
- Agenda.js v5 npm package (`main: "dist/cjs.js"`, exports verification)
- Agenda.js v6 npm package (ESM-only verification, breaking API changes)
- Agenda.js source code: `lib/job/index.ts`, `lib/job/fail.ts`, `lib/job/schedule.ts`, `lib/agenda/jobs.ts`

## Issues Found

1. **Version incompatibility with latest Agenda.js (v6)**: The post used `npm install agenda` which installs v6 by default. All code examples use CommonJS `require()` and the v5 `db: { address, collection }` constructor API, which do not work with v6 (ESM-only, uses `backend` option instead). **Fix**: Changed install command to `npm install agenda@5` and added a note clarifying the examples target v5.

2. **Unused `mongoose` import**: The `scheduler.js` example imported `mongoose` but never used it anywhere in the code block. **Fix**: Removed the unused import.

3. **Incorrect "exponential backoff" comment**: The retry example comment said "Reschedule with exponential backoff" but the formula `(failCount + 1) * 60000` produces linear delays (1 min, 2 min, 3 min), not exponential. **Fix**: Changed comment to "Reschedule with increasing delay."

## Review Notes
- All Agenda.js v5 API usage is correct: `define()`, `start()`, `stop()`, `every()`, `now()`, `schedule()`, `jobs()`, `cancel()`, `job.attrs.data`, `job.attrs.failCount`, `job.schedule()`, `job.save()`.
- The default collection name `agendaJobs` is correctly stated.
- The claim that Agenda does not retry by default is accurate for both v5 and v6.
- The `agenda.every()` calls correctly demonstrate both human-readable interval (`'1 week'`) and cron syntax (`'0 2 * * *'`).
- The `agenda.schedule('in 1 week', ...)` call is valid; Agenda uses the `date.js` library which supports this natural language format.
- If this post is updated for Agenda v6 in the future, note that `require('agenda')` must become `import { Agenda } from 'agenda'`, the `db` constructor option becomes `backend: new MongoBackend(...)`, `agenda.jobs()` becomes `agenda.queryJobs()`, and `agenda.cancel()` takes structured options instead of raw MongoDB queries.
