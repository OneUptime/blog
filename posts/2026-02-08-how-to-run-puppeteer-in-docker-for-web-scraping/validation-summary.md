# Validation Summary: How to Run Puppeteer in Docker for Web Scraping

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker
- Docker Compose
- Puppeteer / puppeteer-core
- Chromium / Headless Chrome
- Node.js
- npm
- JavaScript web scraping

## Sources Consulted
- Puppeteer installation guide: https://pptr.dev/guides/installation
- Puppeteer headless mode guide: https://pptr.dev/guides/headless-modes
- Puppeteer LaunchOptions API reference: https://pptr.dev/api/puppeteer.launchoptions
- Puppeteer Docker and Linux troubleshooting documentation: https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference for `shm_size` and `security_opt`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker CLI `docker run --help` output for `--shm-size`, `-e`, `-v`, and `-d`
- Docker Compose CLI `docker compose up --help` output for `--build`
- npm `ci --help` output for current production dependency installation flags
- Debian package metadata inside `node:20-slim` for Chromium-related package availability

## Issues Found
- The first Dockerfile used `libappindicator3-1`, which is not available in the current Debian 12 base used by `node:20-slim`. Replaced it with `libayatana-appindicator3-1`, which is available on Debian 12.
- The Dockerfile used `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`. Current Puppeteer configuration documents `PUPPETEER_SKIP_DOWNLOAD`; updated the environment variable.
- The Dockerfiles used `npm ci --production`. Current npm help documents `--omit=dev` for omitting development dependencies; updated both Dockerfiles.
- The scraper used `headless: 'new'`. Current Puppeteer documents `headless: true` for the new headless mode and `headless: 'shell'` for the old shell mode; updated the launch option to `headless: true`.
- The Docker Compose example used the obsolete top-level `version: "3.8"` field. Removed it because current Compose uses the Compose Specification and treats `version` as obsolete.
- The Docker Compose example set `OUTPUT_DIR` and the bind mount to `/app/output`, but the main Dockerfile runs the app from `/home/scraper/app`. Updated both paths to `/home/scraper/app/output`.
- The Docker Compose example described `seccomp=unconfined` as required for Chromium. It is not required by the shown `--no-sandbox` launch configuration and weakens container isolation, so the `security_opt` block was removed.
- The parallel `docker run` example mounted `/app/output` without setting `OUTPUT_DIR`, so output would not be written to the mounted host directory. Updated the command to set `OUTPUT_DIR=/home/scraper/app/output` and mount that path.
- The wrap-up described the setup as "locked-down" and referred to "proper security flags" even though the example launches Chromium with `--no-sandbox`. Updated the wording to avoid overstating the security posture.

## Review Notes
The post is now technically valid as a practical Docker/Puppeteer guide. A future improvement would be to explain the security tradeoff of `--no-sandbox` more explicitly and show a sandboxed Chromium configuration for deployments that scrape untrusted pages.
