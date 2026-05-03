# Validation Summary: How to Deploy Huginn via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Huginn (self-hosted automation platform)
- Portainer (Docker management UI)
- Docker / Docker Compose
- MySQL 8.0
- Hacker News web scraping (CSS selectors)
- SMTP email configuration

## Sources Consulted
- Huginn `.env.example`: https://raw.githubusercontent.com/huginn/huginn/master/.env.example
- Huginn Docker README: https://raw.githubusercontent.com/huginn/huginn/master/docker/README.md
- Huginn multi-process README: https://raw.githubusercontent.com/huginn/huginn/master/docker/multi-process/README.md
- Huginn single-process README: https://raw.githubusercontent.com/huginn/huginn/master/docker/single-process/README.md
- Huginn single-process docker-compose.yml: https://raw.githubusercontent.com/huginn/huginn/master/docker/single-process/docker-compose.yml
- Huginn `docker/secrets.env`: https://raw.githubusercontent.com/huginn/huginn/master/docker/secrets.env
- Huginn `docker/scripts/setup_env`: https://raw.githubusercontent.com/huginn/huginn/master/docker/scripts/setup_env
- Huginn `db/seeds/seeder.rb` (default credentials)
- Live HTML of `https://news.ycombinator.com/` plus Wayback Machine for selector dating

## Issues Found

1. **Wrong image for split-DB topology.** The post used `ghcr.io/huginn/huginn:latest`, which is the multi-process image that bundles MySQL inside the container. When MySQL runs in a separate container (as the post does), the correct image is `ghcr.io/huginn/huginn-single-process:latest`. **Fixed**: changed the image reference.

2. **Misplaced data volume.** The huginn web service had `huginn_data:/var/lib/mysql` mounted on it. The single-process Huginn image has no MySQL inside it, so this mount is meaningless and only causes confusion. **Fixed**: removed the volume mount on the huginn service and removed `huginn_data` from the top-level `volumes:` section. (The MySQL service still has its own `huginn_mysql_data` volume on `/var/lib/mysql`, which is correct.)

3. **Wrong env var: `SECRET_TOKEN` → `APP_SECRET_TOKEN`.** Huginn's official `.env.example` uses `APP_SECRET_TOKEN` (not `SECRET_TOKEN`). With the wrong name, Rails would fail to read the secret on boot. **Fixed**: renamed throughout the compose file and the env-var list.

4. **Wrong env var: `SMTP_HOST` → `SMTP_SERVER`.** Huginn's `.env.example` uses `SMTP_SERVER` (e.g., `SMTP_SERVER=smtp.gmail.com`). With `SMTP_HOST`, the SMTP server name would not be picked up. **Fixed**: renamed in both the compose file and the env-var list.

5. **Stale Hacker News CSS selector.** The post used `.storylink`, which has been broken since 2021-10-19 when HN renamed the class to `.titlelink`, and again since late September 2022 when it was renamed to `.titleline` (with the link now being a child `<a>`). **Fixed**: replaced both selectors with `.titleline > a`, which targets the story link in the current HN HTML.

6. **Inaccurate secret-token length hint.** The post said "your-100-char-random-secret" but the suggested generator command (`openssl rand -hex 64`) produces a 128-character hex string (64 bytes). The Huginn-shipped sample token in `docker/secrets.env` is also 128 hex characters. **Fixed**: changed the placeholder to "your-128-char-random-secret".

## Review Notes

- The conclusion still references `ghcr.io/huginn/huginn` as "the community-maintained Docker image for Huginn." This is true — both `ghcr.io/huginn/huginn` (multi-process, bundled MySQL) and `ghcr.io/huginn/huginn-single-process` (used in the compose file) are community-maintained images published from the same repo. The wording is accurate, so no change was made.
- Default credentials `admin` / `password` are confirmed correct via `db/seeds/seeder.rb`. They can be overridden at first boot via `SEED_USERNAME`, `SEED_PASSWORD`, and `SEED_EMAIL` env vars — worth mentioning in a future revision for hardening.
- The Huginn image also accepts `HUGINN_DATABASE_*` prefixed variants of the database env vars, which take precedence over the unprefixed ones. The unprefixed names used in the post are fine and remain supported.
- Compose file format `version: "3.8"` is technically obsolete in modern Docker Compose v2 (the `version` key is ignored), but it does not cause errors and is harmless to leave in place.
- Default MySQL 8.0 uses the `caching_sha2_password` auth plugin. Recent Huginn / mysql2 gem versions support this, so no extra `--default-authentication-plugin` flag is required, though older deployments occasionally need it.
