# Validation Summary: How to Build a Self-Healing Container System with Portainer - Container System

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Portainer API
- Docker Engine API
- Docker Compose
- Docker restart policies
- Docker health checks
- Python 3.11
- Python Requests

## Sources Consulted
- Docker Compose file reference - services, `restart`, and `healthcheck`: https://docs.docker.com/reference/compose-file/services/
- Docker Compose file reference - obsolete top-level `version`: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Engine API reference and OpenAPI specification, containers list/restart and health status: https://docs.docker.com/reference/api/engine/version/v1.54/
- Docker Engine API OpenAPI YAML: https://docs.docker.com/reference/api/engine/version/v1.54.yaml
- Portainer API access and `X-API-Key` authentication: https://docs.portainer.io/api/access
- Portainer API usage examples and Docker API reverse proxy path: https://docs.portainer.io/api/examples
- Requests documentation for `requests.get`, `requests.post`, `timeout`, and `raise_for_status()`: https://requests.readthedocs.io/en/latest/

## Issues Found
- The introduction claimed the system re-pulls updated images, but the tutorial did not implement image pull or redeploy behavior. Removed that claim so the description matches the code.
- The Compose examples used top-level `version: "3.8"`, which the current Compose Specification marks obsolete. Removed the `version` fields from both Compose snippets.
- The watchdog stack passed an API token through an environment variable, but the Python script ignored environment variables and used hard-coded constants. Updated the script to read `PORTAINER_URL` and `PORTAINER_API_KEY` from the environment.
- The watchdog consumed Portainer and Docker API responses without checking HTTP status codes, and it detected unhealthy containers only from Docker's human-readable `Status` string. Added `raise_for_status()`, request timeouts, and a check for Docker API `Health.Status` with the existing `Status` string as a fallback.

## Review Notes
- The Portainer and Docker API paths used by the watchdog are technically valid for Docker environments managed by Portainer.
- The watchdog stack assumes `watchdog.py` exists at the path resolved by Portainer/Compose for the bind mount.
- For a production deployment, a prebuilt watchdog image and alert deduplication would be more robust than installing `requests` at container startup and sending an alert every poll after the restart limit.
