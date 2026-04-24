# Validation Summary: How to Automate Container Cleanup Scripts with Portainer API - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Engine API
- Docker image, container, volume, network, and build-cache pruning
- Python 3
- Kubernetes CronJob
- Cron

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API access and `X-API-Key` authentication: https://docs.portainer.io/2.21/api/access
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Engine API v1.51 reference: https://docs.docker.com/reference/api/engine/version/v1.51/
- Docker Engine API v1.51 OpenAPI spec: https://docs.docker.com/reference/api/engine/version/v1.51.yaml
- Docker prune behavior overview: https://docs.docker.com/engine/manage-resources/pruning/
- Docker `docker volume prune` reference: https://docs.docker.com/reference/cli/docker/volume/prune/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/

## Issues Found
- The Python cleanup function for stopped containers did not actually honor `max_age_hours`. It listed exited and dead containers, assigned `c["Status"]` to `finished_at`, and then deleted every listed container without checking age. I changed it to inspect each container through `/containers/{id}/json`, read `State.FinishedAt`, and only delete containers whose stop time is older than the cutoff.
- The script hardcoded `PORTAINER_URL`, `API_KEY`, and `ENDPOINT_ID`, but the scheduling examples supplied environment variables. I changed the script to read `PORTAINER_URL`, `PORTAINER_API_KEY`, and `PORTAINER_ENDPOINT_ID` from the environment so the examples and code now match.
- The volume cleanup example claimed to remove all unused volumes, but current Docker Engine API docs show that `POST /volumes/prune` only removes anonymous volumes by default unless the `all` filter is set. I added `filters={"all":["true"]}` to the request and aligned the wording with current Docker docs.
- The Kubernetes CronJob example was not runnable as written. It referenced `/scripts/cleanup.py` inside `python:3.11-slim` without providing the script, and it omitted the required Job/Pod restart policy pattern shown in the CronJob docs. I changed it to run a custom image that already contains the script, added `restartPolicy: OnFailure`, added an explicit `timeZone`, and included `PORTAINER_ENDPOINT_ID`.
- The Docker scheduling example was not actually scheduling anything. It started a long-running container with a `CRON_SCHEDULE` environment variable, but no standard Docker behavior uses that variable automatically. I replaced it with a host crontab entry that runs `docker run --rm ...` at the scheduled time.
- The “System Prune via API” section implied a direct Docker API endpoint for `/system/prune`. In current Docker Engine API docs, the documented prune endpoints are per resource (`/containers/prune`, `/images/prune`, `/volumes/prune`, `/networks/prune`, `/build/prune`), while `docker system prune` is documented in the CLI as a shortcut. I replaced the examples with equivalent documented API calls and preserved the separate example for pruning all unused images.
- The post description and introductory wording used “dangling volumes” and “orphaned networks”, but the Docker docs describe these resources as unused volumes and unused networks. I updated the wording to match current documentation.

## Review Notes
- Validated against current Portainer documentation and the current Docker Engine API reference available on April 24, 2026.
- Portainer’s `/api/endpoints/{id}/docker` path is a reverse proxy to the underlying Docker API, so the exact behavior of prune operations also depends on the Docker Engine version behind the selected endpoint.
- Docker volume prune behavior is version-sensitive: in API 1.42+ the default behavior is anonymous volumes only unless the `all` filter is supplied.
- The direct API examples were reviewed against documentation, but they were not executed against a live Portainer environment from this repository.
