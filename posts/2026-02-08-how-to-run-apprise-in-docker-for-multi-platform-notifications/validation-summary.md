# Validation Summary: How to Run Apprise in Docker for Multi-Platform Notifications

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apprise API
- Apprise Python library
- Docker
- Docker Compose
- YAML configuration
- curl
- Slack, Discord, Telegram, email, Pushover, ntfy, Gotify, and Microsoft Power Automate / Workflows notification URLs
- Traefik reverse proxy labels

## Sources Consulted
- Apprise API overview: https://appriseit.com/api/
- Apprise API deployment documentation: https://appriseit.com/api/deployment/
- Apprise API usage documentation: https://appriseit.com/api/usage/
- Apprise API endpoints documentation: https://appriseit.com/api/endpoints/
- Apprise API environment variables: https://appriseit.com/api/reference/environment/
- Apprise OpenAPI specification: https://raw.githubusercontent.com/caronc/apprise-api/master/swagger.yaml
- Apprise configuration documentation: https://appriseit.com/getting-started/configuration/
- Apprise library configuration documentation: https://appriseit.com/library/configuration/
- Apprise supported services catalog: https://appriseit.com/services/
- Apprise Slack documentation: https://appriseit.com/services/slack/
- Apprise Microsoft Power Automate / Workflows documentation: https://appriseit.com/services/workflows/
- Apprise Gotify documentation: https://appriseit.com/services/gotify/
- Apprise ntfy documentation: https://appriseit.com/services/ntfy/
- Apprise Pushover documentation: https://appriseit.com/services/pushover/
- Docker and Docker Compose local CLI checks: `docker --version`, `docker compose version`
- Live `caronc/apprise:latest` container checks for `/status`, `/add/{key}`, `/notify/{key}`, simple-mode config files, and YAML parsing

## Issues Found
- The Docker examples did not set the current recommended Apprise API deployment environment variables. Added `APPRISE_STATEFUL_MODE=simple`, `APPRISE_WORKER_COUNT=1`, and `APPRISE_ADMIN=y` to the quick-start container command and updated the Docker Compose comments to match the official meanings of those variables.
- The Docker Compose health check used a less complete command than the official deployment example. Updated it to use `CMD-SHELL`, `curl -fsS`, `127.0.0.1`, and `start_period: 20s`.
- The Microsoft Teams URL example used an `msteams://` schema that is not available in the current `caronc/apprise:latest` image. Updated the prose and concrete example to the supported Microsoft Power Automate / Workflows schema, `workflows://host/workflow_id/signature`.
- The Telegram placeholders in executable examples did not satisfy Apprise's token parser. Replaced them with valid-looking Telegram bot-token and chat-ID placeholders.
- The YAML configuration example used `url:` mapping entries that the current Apprise parser accepted as a config source but loaded as zero notification services. Rewrote the YAML to the documented URL-key mapping form and added `version: 1`.
- The config-file mount path used `/config/apprise.yml`, but the example later sends to `/notify/alerts`. Changed the mount destination to `/config/alerts.yml`, which matches the `alerts` key in Apprise API simple-mode storage.

## Review Notes
The remaining API JSON payloads, notification type values, Python `apprise.Apprise().notify()` usage, service URL examples, Docker commands, and Traefik labels are technically plausible against current documentation. Live notification delivery was not tested with real third-party credentials; endpoint behavior and parsing were validated with local test URLs and the current Docker image.
