# Validation Summary: How to Deploy Healthchecks.io via Portainer

## Status
validated

## Post Type
Tutorial / Deployment Guide

## Technologies Covered
- Healthchecks.io (self-hosted, open-source cron monitoring)
- Portainer (Docker stack manager)
- Docker / Docker Compose
- PostgreSQL 16 (alpine)
- SMTP (email alerting)
- cron (Linux scheduled tasks)

## Sources Consulted
- Official Healthchecks self-hosted configuration reference: https://healthchecks.io/docs/self_hosted_configuration/
- Official Healthchecks Docker README: https://github.com/healthchecks/healthchecks/blob/master/docker/README.md
- Official Healthchecks Dockerfile: https://github.com/healthchecks/healthchecks/blob/master/docker/Dockerfile
- Docker Hub: `healthchecks/healthchecks` image

## Issues Found
- **Missing `container_name` for the `docker exec` command.** The post instructs the reader to run `docker exec -it healthchecks ./manage.py createsuperuser`, but Docker Compose v2 names containers as `<project>-<service>-<index>` (e.g., `healthchecks-healthchecks-1`) by default, so referring to the container by the bare name `healthchecks` would fail. Added `container_name: healthchecks` to the `healthchecks` service in the compose stack so the documented command works as written. The `./manage.py` relative path is correct because the official image's `WORKDIR` is `/opt/healthchecks`.

## Review Notes
- The image reference `healthchecks/healthchecks:latest` is the correct official image on Docker Hub. For production, pinning to a specific tag (e.g., `v3.x`) is generally a better practice than `latest`, but the tutorial's use of `latest` is a stylistic choice rather than a technical error.
- All environment variables (`SECRET_KEY`, `ALLOWED_HOSTS`, `DEFAULT_FROM_EMAIL`, `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `EMAIL_USE_TLS`, `DB`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SITE_ROOT`, `SITE_NAME`) match the official self-hosted configuration variable names exactly.
- The default port `8000` matches the upstream image's documented exposed port.
- The cron ping URL pattern `https://<site>/ping/<uuid>` is the correct Healthchecks ping endpoint format.
- The `version: "3.8"` field at the top of the compose file is no longer required by Compose v2 (it's silently ignored), but it's still valid and harmless.
- `ALLOWED_HOSTS` will be auto-populated from `SITE_ROOT` if not set, but explicitly listing it (as the post does) is a valid and clearer approach.
