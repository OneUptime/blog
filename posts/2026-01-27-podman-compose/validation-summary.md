# Validation Summary: How to Use Podman Compose

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Podman
- Podman Compose
- Docker Compose / Compose Specification
- Rootless containers
- Podman networking and volumes
- SELinux volume relabeling
- Systemd Quadlet
- Node.js HTTP server
- PostgreSQL, Redis, and Nginx containers
- OpenTelemetry Collector
- OneUptime telemetry ingestion

## Sources Consulted
- Podman Compose official repository: https://github.com/containers/podman-compose
- Podman `podman compose` documentation: https://docs.podman.io/en/latest/markdown/podman-compose.1.html
- Podman `podman generate systemd` documentation: https://docs.podman.io/en/latest/markdown/podman-generate-systemd.1.html
- Podman Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman volume option documentation for `:z` / `:Z`: https://docs.podman.io/en/v4.3/markdown/options/volume.html
- Podman installation and latest stable version page: https://podman.io/docs/installation and https://podman.io/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose secrets documentation: https://docs.docker.com/compose/how-tos/use-secrets/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector OTLP HTTP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- Node.js HTTP API documentation: https://nodejs.org/api/http.html
- Docker Official Node image documentation: https://hub.docker.com/_/node

## Issues Found
- The post recommended `podman generate systemd` for production systemd units. That command is now deprecated in Podman documentation, which recommends Quadlet instead. I replaced the section with a Quadlet `.container` example and updated the summary table.
- The podman-compose Python requirement was listed as Python 3.6+. The current podman-compose README requires Python 3.9 or newer. I updated the installation note.
- The sample podman-compose version output was outdated. I updated it to the current 1.6.0 release shown by the official repository.
- The sample Podman version output was outdated. I updated it to the current stable Podman 5.8.2 listed by podman.io.
- The Compose examples used top-level `version` fields such as `version: "3.8"`. Docker's current Compose reference identifies the Compose Specification as the recommended format and legacy 2.x/3.x versions as merged into the specification, so I removed the obsolete `version` keys from examples.
- The first application's API Dockerfile ran `npm ci --only=production`, but the project structure did not include `package.json` and the sample server uses only Node.js built-ins. I removed the dependency-install step so the Dockerfile matches the files shown.
- The frontend service was configured with `build: ./frontend`, but the post did not provide a frontend Dockerfile. I changed it to use `nginx:alpine` with a read-only bind mount for the shown `frontend/index.html`.
- The comparison table described Docker secrets only as "Docker Swarm secrets" and resource limits as "Full support". I corrected the secrets comparison and softened the resource-limit claim because support depends on Compose implementation and Podman/podman-compose versions.
- The OneUptime OpenTelemetry exporter example used `https://otlp.oneuptime.com` and omitted the JSON encoding and content type required by current OneUptime collector documentation. I updated the endpoint to `https://oneuptime.com/otlp`, added `encoding: json`, added `Content-Type: application/json`, and used current OpenTelemetry Collector environment expansion syntax.
- The OpenTelemetry Collector example used the `otlphttp` exporter key. Current OpenTelemetry Collector documentation states that `otlphttp` is a deprecated alias, so I changed it to `otlp_http`.

## Review Notes
- I validated a representative Compose configuration with `docker compose config -q --no-path-resolution`.
- I validated the primary Node.js server snippet with `node --check`.
- Podman and podman-compose were not installed in the local environment, so their runtime behavior was verified against official documentation rather than local execution.
