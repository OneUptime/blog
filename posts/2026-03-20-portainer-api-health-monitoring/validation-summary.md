# Validation Summary: How to Monitor Container Health Programmatically via Portainer API

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer API
- Docker Engine API
- Python
- `requests`
- Bash / `curl`
- Docker / Dockerfile

## Sources Consulted
- Portainer API documentation landing page: https://docs.portainer.io/api/docs
- Portainer API access documentation: https://docs.portainer.io/api/access
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Docker Engine API v1.53 OpenAPI specification: https://docs.docker.com/reference/api/engine/version/v1.53.yaml
- Docker Engine API version history: https://docs.docker.com/reference/api/engine/version-history/
- `docker container run` reference: https://docs.docker.com/reference/cli/docker/container/run
- Dockerfile reference: https://docs.docker.com/reference/builder

## Issues Found
1. **Inaccurate prerequisite wording about exit codes.** The post said Docker health monitoring could "rely on process exit codes". Exit codes indicate whether a container process exited, not a live container health status. Updated the prerequisite to distinguish Docker healthchecks from simple running/exited state monitoring.
2. **Health status lookup relied on the container list summary alone.** Docker's `GET /containers/json` summary `Health` field was added later, and the API spec notes it is included starting with v1.52. The quick shell example now labels this as a summary field, and the main Python monitor was updated to inspect each container via `GET /containers/{id}/json` for authoritative `State.Health.Status`.
3. **CPU and memory calculations were not aligned with Docker's documented stats formulas.** The original CPU logic defaulted to one CPU when `online_cpus` was absent, and the memory logic used raw `memory_stats.usage` without subtracting cache or inactive file usage. Updated both calculations to follow Docker's documented guidance more closely.
4. **Failure counting and remediation logic did not match the stated "3 failed checks" behavior.** The original script incremented failure counters multiple times per cycle, never reset them after a healthy cycle, and could restart based on duplicated issue counting. Updated the script to track consecutive failing cycles per container and reset the counter when a container is healthy again.
5. **Automated remediation was not actually executed.** The post claimed automated remediation, but the restart call was commented out and the handler did not have the container ID it needed. Updated the issue payload to carry the container ID and made the script call the Portainer/Docker restart endpoint for high-severity issues after the threshold is reached.
6. **Docker containerization example was incomplete.** The Dockerfile snippet depended on a `requirements.txt` file that the post never created, the image was never built before `docker run`, and the runtime environment variables passed to `docker run` were ignored by the Python script. Updated the Dockerfile to install `requests` directly, added the `docker build` step, and changed the script to read `PORTAINER_URL`, `PORTAINER_API_KEY`, `ENDPOINT_ID`, and `CHECK_INTERVAL` from environment variables.

## Review Notes
- Verified that Portainer documents `X-API-Key` authentication and the `/api/endpoints/<ENVIRONMENT_ID>/docker/...` reverse-proxy pattern for Docker API calls.
- Verified from the Docker Engine API spec that `POST /containers/{id}/restart` returns `204` on success, and that `GET /containers/{id}/stats?stream=false` is the documented one-shot stats call.
- The quick `containers/json` example still depends on Docker API summary data for `Health`; the post now notes this is a summary field on newer Docker API versions, while the main monitoring script uses `inspect` so it remains accurate on a wider range of daemons.
- The embedded Python code was syntax-checked locally after editing, but it was not exercised against a live Portainer instance during review.
