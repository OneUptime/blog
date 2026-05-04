# Validation Summary: How to Set Up Container PID Limits in Portainer

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Portainer (CE/BE)
- Docker (CLI, docker-compose)
- jq (JSON processor)
- Portainer REST API
- Bash / curl

## Sources Consulted
- Docker CLI reference: https://docs.docker.com/reference/cli/docker/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker `inspect` HostConfig fields: https://docs.docker.com/reference/cli/docker/container/inspect/
- Docker resource constraints (including `--pids-limit`): https://docs.docker.com/engine/containers/resource_constraints/
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer Docker proxy endpoints (`/api/endpoints/{id}/docker/...`): https://docs.portainer.io/api/access
- jq manual: https://jqlang.github.io/jq/manual/

## Issues Found
No technical issues found. All commands, syntax, and API endpoints in the post are correct:
- `docker inspect`, `docker ps`, `docker stats`, `docker logs`, `docker exec`, `docker cp`, `docker run --user` — syntax and flags are valid.
- jq expressions (`.[0].Config`, `.[0].Config.User`, `.[0].HostConfig | {Memory, CpuShares, CpuQuota}`) are syntactically correct and reference real fields in `docker inspect` output.
- The docker-compose YAML structure (services, deploy.resources.limits, healthcheck, environment, volumes, networks) is valid.
- Portainer API endpoints `/api/auth` (with `Username`/`Password` returning `jwt`) and `/api/endpoints/{id}/docker/containers/json` (Docker proxy) are correct.

## Review Notes
- **Title vs. content mismatch (significant editorial issue, but not a technical inaccuracy):** The post is titled "How to Set Up Container PID Limits in Portainer" but never actually discusses PID limits. There is no mention of Docker's `--pids-limit` flag, the `pids_limit` field in docker-compose, or the `PidsLimit` field in `HostConfig`. The body is a generic container management/inspection guide. A future revision should either retitle the post or add the PID-limit-specific content (e.g., `pids_limit: 100` in compose, `--pids-limit 100` on `docker run`, and including `PidsLimit` in the verification jq query). Per review guidelines I did not add new sections, so the existing technically-correct content is left intact.
- `version: "3.8"` in the docker-compose example is still accepted but the `version` field is now considered obsolete in the Compose Specification (newer `docker compose` will print a warning). Not wrong, but worth modernizing in a future revision.
- The healthcheck uses `curl`, which is not installed in many minimal base images (e.g. `alpine`, `distroless`). It would be more robust to use `wget` or a language-native check, but this is a stylistic/portability note, not an error.
- The example Portainer API call uses `endpoints/1` — the endpoint ID `1` is just an example and readers should substitute their own; the post could make that clearer.
