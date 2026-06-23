# Validation Summary: How to Run Cron Jobs Inside Docker Containers (The Right Way)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker / Docker Compose
- Supercronic (aptible/supercronic)
- Ofelia (mcuadros/ofelia)
- Traditional Unix cron (Debian/Ubuntu `cron`)
- node-cron (Node.js)
- APScheduler (Python)
- Healthchecks.io (dead man's switch monitoring)
- PostgreSQL (compose example)

## Sources Consulted
- Supercronic GitHub repo & README — https://github.com/aptible/supercronic
- Supercronic "Make images available on Docker Hub" issue #85 (still open) — https://github.com/aptible/supercronic/issues/85
- Supercronic man page (flags reference) — https://manpages.debian.org/unstable/supercronic/supercronic.1
- Ofelia GitHub repo & jobs documentation — https://github.com/mcuadros/ofelia and https://github.com/mcuadros/ofelia/blob/master/docs/jobs.md
- Ofelia releases page (version check) — https://github.com/mcuadros/ofelia/releases
- Healthchecks.io Pinging API docs — https://healthchecks.io/docs/http_api/

## Issues Found

1. **Non-existent Supercronic Docker image (`COPY --from=aptible/supercronic:latest`).**
   The post used `COPY --from=aptible/supercronic:latest /usr/local/bin/supercronic ...` in three places
   (Dockerfile.cron, the healthcheck Dockerfile, and the Quick Reference). Supercronic does **not** publish
   an official image on Docker Hub — issue #85 requesting exactly that is still open, and the official README
   only documents downloading the static release binary. These `COPY --from` builds would fail.
   **Fix:** Replaced each occurrence with the officially recommended `wget` download of the release binary
   (`supercronic-linux-${TARGETARCH}`), consistent with the post's own "Basic Setup" Dockerfile.

2. **Ofelia using standard 5-field cron instead of its 6-field (seconds-first) format.**
   Ofelia's documentation explicitly states "the format starts with seconds, instead of minutes" (6 fields:
   sec min hour day month weekday). The current stable release is v0.3.x (latest stable 0.3.20; 0.4.0 is only
   beta), where the seconds field is required, so `:latest` expects 6 fields. The post used 5-field schedules
   in the Docker-label example, the `ofelia.ini` example, and the Quick Reference (e.g. `*/5 * * * *`,
   `0 2 * * *`, `0 8 * * 1`).
   **Fix:** Converted all Ofelia schedules to the 6-field form (`0 */5 * * * *`, `0 0 2 * * *`, `0 0 8 * * 1`),
   added a short clarifying note about the seconds-first format, and corrected the misleading
   "Schedule format follows standard cron syntax" comment in the Quick Reference.

3. **Incorrect Healthchecks.io ping host.**
   The post used `https://healthchecks.io/ping/<uuid>` in two places. The hosted service's ping endpoint is
   `https://hc-ping.com/<uuid>` (the `healthchecks.io/ping/...` path is not a valid ping endpoint).
   **Fix:** Changed both occurrences to `https://hc-ping.com/...`.

## Review Notes
- The Supercronic version pin (`0.2.29`) is an older release (latest is ~0.2.46) but the release URL and
  binary naming remain valid, so it still builds correctly. Readers may wish to bump to a newer version; left
  as-is since it is not an error.
- Supercronic flags used in the post (`-json`, `-test`) are valid per the man page. `-json` formats logs as
  JSON; `-test` validates the crontab and exits.
- The "Problem 1" Dockerfile (`FROM ubuntu` + `cron -f`) is intentionally a broken/anti-pattern example, so
  its minor crontab-format issues are by design and were left untouched.
- node-cron (`cron.schedule(...)`) and APScheduler (`BlockingScheduler` + `@scheduled_job('interval'/'cron')`)
  examples are syntactically correct against current library APIs.
- The Docker Compose, PostgreSQL healthcheck (`pg_isready`), and `docker exec` host-cron examples are accurate.
