# Validation Summary: How to Integrate Portainer API with PagerDuty for Alerts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Portainer API
- Docker Engine API
- PagerDuty Events API v2
- Python 3
- Docker Compose

## Sources Consulted
- Portainer Documentation: Accessing the Portainer API — https://docs.portainer.io/2.21/api/access
- Portainer Documentation: API usage examples — https://docs.portainer.io/sts/api/examples
- Portainer Documentation: API documentation — https://docs.portainer.io/api/docs
- Docker Docs: Docker Engine API v1.47 reference — https://docs.docker.com/reference/api/engine/version/v1.47/
- Docker Docs: `docker compose logs` — https://docs.docker.com/reference/cli/docker/compose/logs/
- Docker Docs: Version and name top-level elements — https://docs.docker.com/reference/compose-file/version-and-name/
- PagerDuty Support: Services and Integrations — https://support.pagerduty.com/main/docs/services-and-integrations
- PagerDuty Support: Rulesets — https://support.pagerduty.com/main/docs/rulesets
- PagerDuty Support: Dynamic Notifications — https://support.pagerduty.com/main/docs/dynamic-notifications

## Issues Found
- The Python example read Docker health status from the container list response, but Docker exposes health data on container inspection responses. I updated the script to inspect each running container through Portainer's Docker proxy before checking `State.Health.Status`.
- The compose example set environment variables that the Python script never read. I updated the script to use `PORTAINER_URL`, `PORTAINER_API_KEY`, `PAGERDUTY_ROUTING_KEY`, `ENDPOINT_ID`, and `CHECK_INTERVAL` from the environment.
- State incidents only auto-resolved for the specific `Container is exited` dedup key. I updated the script to resolve any active container-state incident for the container when it recovers or changes state, preventing stale PagerDuty incidents.
- The deployment snippet depended on an unstated `requirements.txt` file. I replaced that with a direct `pip install requests` command so the example is self-contained.
- The testing snippet used `docker logs -f pagerduty-integration`, but the example deploys the workload as a Compose service. I changed it to `docker compose logs -f pagerduty-integration`.
- The Compose example used the top-level `version` field, which Docker documents as obsolete. I removed it.

## Review Notes
- The script now makes one container inspection call per running container per polling cycle because Docker health status is not included in the container list response. This matches the current Docker API shape exposed through Portainer.
