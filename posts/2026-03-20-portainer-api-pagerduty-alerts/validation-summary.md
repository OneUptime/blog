# Validation Summary: How to Integrate Portainer API with PagerDuty for Alerts - Alerts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer API
- Docker Swarm / Docker Engine API
- PagerDuty Events API v2
- Docker Compose
- Python 3
- `requests`

## Sources Consulted
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer access token authentication (`X-API-Key`): https://docs.portainer.io/2.21/api/access
- Portainer CE OpenAPI spec (`/endpoints/{id}/docker` reverse proxy note): https://api-docs.portainer.io/versions/ce/2.39.1.yaml
- Docker Engine API version history (`GET /services` `status` query parameter): https://docs.docker.com/reference/api/engine/version-history/
- Docker Engine OpenAPI schema (`ServiceStatus`, `RunningTasks`, `DesiredTasks`): https://raw.githubusercontent.com/moby/moby/master/api/swagger.yaml
- Docker Compose version/name reference (`version` is obsolete): https://docs.docker.com/reference/compose-file/version-and-name/
- PagerDuty services and integrations (Events API v2 integration key usage): https://support.pagerduty.com/main/docs/services-and-integrations
- PagerDuty alerts documentation (`resolve` requires matching `dedup_key`): https://support.pagerduty.com/main/docs/alerts
- PagerDuty dynamic notifications (`severity` required for Events API v2): https://support.pagerduty.com/main/docs/dynamic-notifications

## Issues Found
- The Python example authenticated to Portainer with `Authorization: Bearer ...`, but Portainer documents API access tokens via the `X-API-Key` header. I changed the request header so the example matches the documented auth mechanism.
- The script relied on `ServiceStatus` fields without requesting them. Docker documents that `GET /services` only includes `ServiceStatus` when the `status=true` query parameter is set. I added that query parameter so `RunningTasks` and `DesiredTasks` are available as used later in the script.
- The post description referenced Docker and Kubernetes environments, but the implementation only queries the Docker Swarm services API through Portainer's Docker proxy. I narrowed the wording to Docker Swarm so the scope matches the code.
- The compose snippet wrapped the shell command in extra quotes, which causes `/bin/sh -c` to treat the whole line as a single command name and fail. I removed the extra quotes.
- The compose snippet used `https://portainer:9443` as if a `portainer` hostname were automatically resolvable, but the example only defined the monitor service. I changed it to a host placeholder to avoid implying DNS that the snippet does not provide.
- The compose snippet mapped `PAGERDUTY_ROUTING_KEY` from `${PAGERDUTY_KEY}`, which did not match the variable name used by the Python script. I aligned the environment variable names.
- The compose snippet used the top-level `version: "3.8"` field, which current Docker Compose documentation marks as obsolete. I removed it and kept the example in current Compose-spec form.
- The snippet filename comment implied a Swarm stack deployment (`monitor-stack.yml`), but the file content used Compose-oriented behavior such as `restart: unless-stopped`. I renamed the example filename comment to avoid implying the wrong deployment mode.

## Review Notes
- The example assumes the monitor container can establish a trusted HTTPS connection to Portainer on port `9443`. If Portainer uses a self-signed certificate, the container will need the issuing CA installed or the request verification logic adjusted.
- The script is Docker Swarm-specific. Portainer can also proxy Kubernetes APIs, but that would require different endpoints and payload handling than the example shown here.
- The script sends resolve events on every healthy polling cycle. This is acceptable, but PagerDuty will drop resolve events when no open alert exists with the same `dedup_key`.
