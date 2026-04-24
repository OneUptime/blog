# Validation Summary: How to Deploy Healthchecks.io via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Healthchecks.io
- Docker / Docker Compose
- PostgreSQL
- Portainer
- Cron
- curl
- wget
- Traefik

## Sources Consulted
- Healthchecks.io: Running with Docker: https://healthchecks.io/docs/self_hosted_docker/
- Healthchecks.io: Server Configuration: https://healthchecks.io/docs/self_hosted_configuration/
- Healthchecks.io: Pinging API: https://healthchecks.io/docs/http_api/
- Healthchecks.io: Signaling failures: https://healthchecks.io/docs/signaling_failures/
- Healthchecks.io: Configuring Notifications: https://healthchecks.io/docs/configuring_notifications/
- Healthchecks.io: Projects and Teams: https://healthchecks.io/docs/projects_teams/
- Healthchecks.io: PagerDuty integration: https://healthchecks.io/integrations/pagerduty/
- Healthchecks.io: Telegram integration: https://healthchecks.io/integrations/telegram/
- healthchecks/healthchecks upstream Docker example: https://github.com/healthchecks/healthchecks/blob/master/docker/docker-compose.yml
- healthchecks/healthchecks upstream env example: https://github.com/healthchecks/healthchecks/blob/master/docker/.env.example
- healthchecks/healthchecks upstream uWSGI config: https://github.com/healthchecks/healthchecks/blob/master/docker/uwsgi.ini
- healthchecks/healthchecks upstream settings: https://github.com/healthchecks/healthchecks/blob/master/hc/settings.py
- Docker Docs: Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Services / `depends_on`: https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Control startup order: https://docs.docker.com/compose/how-tos/startup-order/
- Docker Docs: `docker container exec`: https://docs.docker.com/engine/reference/commandline/exec
- Portainer Docs: Add a new stack: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Portainer Docs: How do automatic updates for stacks/applications work?: https://docs.portainer.io/faqs/troubleshooting/stacks-deployments-and-updates/how-do-automatic-updates-for-stacks-applications-work
- `curl --help all`
- `wget --help`

## Issues Found
- The Compose example used the top-level `version: "3.8"` field, which Docker now marks as obsolete. I removed it.
- The guide was written as a general Portainer stack deployment, but the readiness logic it relies on (`depends_on` with `condition: service_healthy`) is a Docker Compose pattern. I clarified that the walkthrough targets Portainer on a Docker Standalone environment.
- The `healthchecks` service declared a `/data` volume and described it as persisting uploaded media and static files. Upstream Healthchecks does not document that as required persistent application data for this deployment pattern, so I removed the unused volume and the incorrect explanation.
- The post used unsupported `SUPERUSER_EMAIL` and `SUPERUSER_PASSWORD` environment variables and claimed Healthchecks creates the admin account automatically on first start. Healthchecks' Docker docs instead require running `createsuperuser`, so I removed the unsupported variables and replaced the deployment step with a documented `manage.py createsuperuser` workflow using `docker exec`.
- The post said the dashboard would be reachable at the server IP or the configured domain. Because Healthchecks derives `ALLOWED_HOSTS` from `SITE_ROOT` when `ALLOWED_HOSTS` is not explicitly set, the configured domain is the reliable default here. I removed the server-IP instruction.
- Step 2 told readers to update values in Portainer stack environment variables even though the Compose snippet hardcoded literal strings. I corrected the wording to say either edit the compose values directly or replace them with `${VARIABLE}` placeholders before using Portainer's stack environment variables.
- The Compose example included `TZ` and described it as controlling Healthchecks UI and scheduling behavior, but upstream Healthchecks reads `TIME_ZONE` from its settings and does not consume a `TZ` app configuration variable. I removed it.
- The notification setup section described PagerDuty as a manual integration-key entry and Telegram as a bot-token/chat-ID entry. Healthchecks' official integration flow uses PagerDuty OAuth and requires Telegram bot configuration plus `settelegramwebhook`, so I corrected those instructions.
- The post said integrations could be applied "globally". Healthchecks documents integrations as project-scoped, so I changed the wording to reflect per-project, per-check toggling.

## Review Notes
- The guide still uses `healthchecks/healthchecks:latest`. That works, but a pinned image tag is usually safer for production because it avoids unplanned upgrades.
- The optional Traefik labels are syntactically correct, but Traefik must be able to reach the service on a shared Docker network for the router to work.
- Updating the Healthchecks application image is straightforward, but PostgreSQL major-version upgrades are a separate operational task and require upgrading the Postgres data directory rather than only pulling a newer image tag.
