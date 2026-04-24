# Validation Summary: How to Set Up Automated Container Health Monitoring with Portainer (2)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Engine API
- Docker health checks
- Python
- Flask
- PostgreSQL
- Redis
- Slack webhooks
- Uptime Kuma

## Sources Consulted
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Dockerfile `HEALTHCHECK` reference: https://docs.docker.com/reference/builder/#healthcheck
- Docker Engine API v1.44 reference: https://docs.docker.com/reference/api/engine/version/v1.44/
- Docker Engine API v1.44 OpenAPI spec: https://docs.docker.com/reference/api/engine/version/v1.44.yaml
- Portainer API access docs: https://docs.portainer.io/sts/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer CE 2.39.1 OpenAPI spec: https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Flask quickstart and API docs: https://flask.palletsprojects.com/en/stable/quickstart/ and https://flask.palletsprojects.com/en/stable/api/?highlight=jsonify
- Psycopg2 module docs: https://www.psycopg.org/docs/module.html
- redis-py docs: https://redis.readthedocs.io/
- Uptime Kuma README and official Compose example: https://github.com/louislam/uptime-kuma and https://raw.githubusercontent.com/louislam/uptime-kuma/master/compose.yaml

## Issues Found
- The Compose snippets used the top-level `version: '3.8'` field, which current Docker Compose documents as obsolete. I removed the `version` lines from the YAML examples.
- The `nginx:latest` example health check targeted `http://localhost/health`, which stock Nginx does not expose. I changed that example to `nginx -t`, which is valid for the image shown.
- The PostgreSQL example used `pg_isready -U postgres -d mydb`, which assumes a database name that was not configured anywhere in the snippet. I changed it to `pg_isready -U postgres` so the example matches the shown service definition.
- The Flask health endpoint returned HTTP 503 for database failures but still returned HTTP 200 for Redis failures, which could let degraded application state pass the container health check. I changed Redis failures to set `http_status = 503` as well.
- The Portainer monitor script tried to read container health from the container list response. Portainer documents that `/api/endpoints/<ENVIRONMENT_ID>/docker/containers/json` returns the Docker `ContainerList` payload, and the Docker v1.44 API spec does not include health data in `ContainerSummary`; health is exposed via container inspect under `State.Health`. I updated the script to inspect each running container and read `State.Health.Status`.
- The Portainer stack example injected `PORTAINER_URL`, `PORTAINER_API_KEY`, and `SLACK_WEBHOOK` as environment variables, but the Python script ignored them and hard-coded its configuration. I updated the script to read the environment variables and added `PORTAINER_ENDPOINT_ID` to the stack example.
- The API monitor sample did not check HTTP status codes or set request timeouts. I added `raise_for_status()` and explicit timeouts so the example behaves predictably on API and webhook failures.
- The Uptime Kuma example used `louislam/uptime-kuma:latest`, while the official project’s current Docker examples use the major tag `louislam/uptime-kuma:2`. I aligned the example with the project’s official sample.

## Review Notes
- The Uptime Kuma monitor against `/api/system/status` is technically valid, but it checks Portainer availability rather than individual container health. The container-level monitoring in this post comes from Docker health checks and the Portainer API monitor script.
- The Portainer stack example assumes `health_monitor.py` is available on the Docker host for the bind mount. That is valid for file-based deployments, but a future revision could make the example more self-contained by packaging the script into an image.
