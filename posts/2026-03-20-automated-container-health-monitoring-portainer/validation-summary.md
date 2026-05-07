# Validation Summary: How to Set Up Automated Container Health Monitoring with Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Compose
- Docker Engine API
- Python
- Bash
- Cron
- PostgreSQL
- Redis

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Accessing the Portainer API: https://docs.portainer.io/2.21/api/access
- Docker Compose file reference, version and name: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose file reference, services / healthcheck: https://docs.docker.com/reference/compose-file/services/#healthcheck
- Docker container list CLI reference: https://docs.docker.com/reference/cli/docker/container/ls/
- Docker restart policy documentation: https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Engine API schema (authoritative upstream Swagger): https://raw.githubusercontent.com/moby/moby/master/api/swagger.yaml

## Issues Found
- Removed the top-level `version: "3.8"` line from the Compose example. Current Docker Compose documentation marks the top-level `version` field as obsolete and warns when it is used.
- Fixed the Python health-monitoring logic so it matches Docker's actual container list response semantics. Docker exposes a machine-readable `State` field and a human-readable `Status` field with health details; the original `startswith("unhealthy")` / `"Restarting"` checks could miss typical values such as `Up 5 minutes (unhealthy)`.
- Updated the restart script to pass the full container ID to `/containers/{id}/restart` instead of truncating it to 12 characters. The Docker API documents this path parameter as the container ID or name, so using the full ID is the safe documented form.
- Replaced the placeholder `ptr_your_api_key_here` with a generic Portainer API key placeholder to align with Portainer's documentation.
- Added a note that the Python example requires the `requests` package, clarified that the web app health check assumes `curl` exists inside the image, and updated the cron example to log stderr as well as stdout.

## Review Notes
- Cron only schedules the script; alerting still requires an external monitoring system or log-based alert rule, which is consistent with the post's recommendation to pair this setup with OneUptime or another monitoring platform.
- Portainer's documentation currently spans multiple maintained doc versions, but the `/api/endpoints/<ENVIRONMENT_ID>/docker/...` reverse-proxy pattern used in the post is documented and consistent across the current Portainer docs consulted.
