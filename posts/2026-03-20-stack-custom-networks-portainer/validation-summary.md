# Validation Summary: How to Deploy Stacks with Custom Network Configurations in Portainer (2)

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Portainer CE/BE stacks
- Docker Compose and the Compose Specification
- Docker Standalone networking
- Docker Swarm stack deployment
- Docker bridge and overlay networks
- Compose healthchecks, profiles, networks, and volumes
- NFS and tmpfs-backed Docker volumes

## Sources Consulted
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy specification: https://docs.docker.com/reference/compose-file/deploy/
- Docker Compose fragments and YAML anchors: https://docs.docker.com/reference/compose-file/fragments/
- Docker Compose profiles guide: https://docs.docker.com/compose/how-tos/profiles/
- Docker Compose `config` CLI reference: https://docs.docker.com/reference/cli/docker/compose/config/
- Docker stack deployment guide: https://docs.docker.com/engine/swarm/stack-deploy/
- Docker stack `config` CLI reference: https://docs.docker.com/reference/cli/docker/stack/config/
- Docker service logs CLI reference: https://docs.docker.com/reference/cli/docker/service/logs/
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker overlay network driver documentation: https://docs.docker.com/engine/network/drivers/overlay/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Docker restart policy documentation: https://docs.docker.com/engine/containers/start-containers-automatically/
- Portainer add stack documentation: https://docs.portainer.io/user/docker/stacks/add
- Portainer inspect/edit stack documentation: https://docs.portainer.io/user/docker/stacks/edit

## Issues Found
- The post described the example as covering multi-host connectivity while the Compose networks used the `bridge` driver, which is single-host. Updated the description, introduction, and Step 2 note to clarify that the example targets Docker Standalone and that Swarm multi-host networking should use overlay networks.
- The main Compose example used the obsolete top-level `version: "3.8"` field. Removed it because the current Compose Specification treats `version` as informational and obsolete.
- The `x-common-healthcheck` anchor was nested under a `healthcheck` key, which would merge into each service as `healthcheck.healthcheck` instead of merging the expected healthcheck fields. Changed the anchor to contain `interval`, `timeout`, `retries`, and `start_period` directly.
- The frontend `wget` healthcheck would download the response body by default. Updated it to use `wget --spider -q` so it checks the endpoint without writing files.
- The API `DB_URL` did not include the configured PostgreSQL username or password. Updated it to use `postgresql://appuser:${DB_PASSWORD}@postgres:5432/appdb`.
- The environment variable example labeled unused variables as required. Kept the example values but marked only `DB_PASSWORD` as required by the shown Compose file.
- The article mixed Docker Standalone Compose behavior with Docker Swarm stack behavior. Added Swarm caveats for profiles, `depends_on.condition`, and network compatibility, and added `docker stack config --compose-file docker-compose.yml` as a Swarm compatibility check.
- The monitoring section said resource usage is viewed per service. Updated this to "per container or service" to match Portainer's Docker Standalone and Swarm views.
- The update section claimed Portainer performs a rolling update for all stacks. Changed this to "redeploys the stack with the updated configuration"; rolling update semantics are Swarm-specific and depend on service update settings.
- The troubleshooting section only showed `docker compose logs`, which applies to Docker Standalone stacks. Clarified that command and added `docker service logs stack-name_service-name` for Swarm services.
- The conclusion claimed the sample creates self-healing stacks. Reworded this to say healthchecks and dependencies improve startup ordering and operational visibility.

## Review Notes
- The YAML snippets were parsed successfully with PyYAML after the fixes.
- Docker is not installed in this workspace, so `docker compose config` and `docker stack config` could not be executed locally.
- The example still uses placeholder images (`my-frontend:latest`, `my-api:latest`); those images must include the referenced healthcheck tools and endpoints for the stack to run as shown.
