# Validation Summary: How to Set Up Automated Testing with Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Compose
- Docker Engine
- PostgreSQL
- Bash
- Jest
- `jest-junit`
- CI/CD pipelines

## Sources Consulted
- Portainer API access docs: https://docs.portainer.io/2.21/api/access
- Portainer API docs: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer stack webhooks docs: https://docs.portainer.io/sts/user/docker/stacks/webhooks
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add?fallback=true
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose networking docs: https://docs.docker.com/compose/how-tos/networking/
- Docker host networking docs: https://docs.docker.com/engine/network/drivers/host/
- Docker `docker compose run` reference: https://docs.docker.com/reference/cli/docker/compose/run/
- Jest CLI docs: https://jestjs.io/docs/cli
- Jest configuration docs: https://jestjs.io/docs/29.7/configuration
- `jest-junit` reporter docs: https://github.com/jest-community/jest-junit
- PostgreSQL `pg_isready` docs: https://www.postgresql.org/docs/current/app-pg-isready.html

## Issues Found
- The Compose example used the obsolete top-level `version` field and described one-shot test services too broadly for Portainer. I removed the obsolete `version` line and clarified that the example is for Docker Standalone, where Docker leaves the container stopped unless a restart policy is configured.
- The integration-test example used `--network host`, which is unnecessary for reaching an external staging URL and is platform-specific in Docker. I removed `--network host` and clarified that stack webhooks are a Portainer Business Edition feature for non-Edge environments.
- The database migration example did not match the earlier Compose snippet: it referenced a different network name, a different database hostname, and different credentials. I replaced it with `docker compose run --rm` against the existing `api` service using the same `db` hostname and test credentials shown earlier in the post.
- The Portainer API health-verification snippet was incorrect. It fetched the stack file but ignored the result, mixed Portainer API calls with a local `docker ps`, did not use Portainer's environment endpoint information, and did not fail if the timeout elapsed. I replaced it with a working Portainer API key flow that looks up the stack, gets its `EndpointId`, queries containers through Portainer's Docker API gateway, inspects container readiness, and exits non-zero on timeout.
- The Jest JUnit example used `--outputFile` incorrectly. Jest's CLI only uses `--outputFile` with `--json`, and reporter options are not configured via CLI. I changed the example to use supported reporter flags plus `JEST_JUNIT_OUTPUT_DIR` and `JEST_JUNIT_OUTPUT_NAME`.

## Review Notes
- The Compose-specific examples in this post are now correctly scoped to Docker Standalone behavior. Portainer Swarm stacks are deployed differently and have different feature support.
- The `api` healthcheck uses `curl`, so the application image must include `curl` or an equivalent probe command.
- The fixed CI workflow still uses `sleep 30` as a simple wait strategy. That is technically valid, but the Portainer/Docker API polling approach shown later in the post is more reliable when startup times vary.
