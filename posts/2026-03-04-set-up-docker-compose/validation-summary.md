# Validation Summary: How to Set Up Docker Compose on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- Docker Engine / Docker CE
- Docker Compose v2
- Docker Compose YAML configuration
- NGINX container image
- Node.js container image
- PostgreSQL container image

## Sources Consulted
- Docker Docs: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Docker Docs: Install the Docker Compose plugin on Linux - https://docs.docker.com/compose/install/linux/
- Docker Docs: Docker Compose overview - https://docs.docker.com/compose/
- Docker Docs: Compose application model and default Compose file names - https://docs.docker.com/compose/compose-application-model/
- Docker Docs: Compose file reference - https://docs.docker.com/reference/compose-file/
- Docker Docs: Version top-level element is obsolete - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose services reference, including depends_on, restart, volumes, environment, and working_dir - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Merge Compose files and override files - https://docs.docker.com/compose/how-tos/multiple-compose-files/merge/
- Docker Docs: Docker Compose CLI reference - https://docs.docker.com/reference/cli/docker/compose/
- Docker Docs: PostgreSQL setup and data persistence guide - https://docs.docker.com/guides/postgresql/immediate-setup-and-data-persistence/
- Docker Official Images: Node image - https://hub.docker.com/_/node
- Docker Official Images: NGINX image - https://hub.docker.com/_/nginx/
- Docker Official Images: PostgreSQL image - https://hub.docker.com/_/postgres

## Issues Found
- The Compose examples used the top-level `version: '3.8'` field. Current Docker Compose treats this field as obsolete and ignores it, so it was removed from both YAML snippets.
- The API service used `command: node server.js` while the tutorial did not create an `api/server.js` file. Because `./api:/app` bind-mounts the host directory over `/app`, the API container would exit if that file was missing. The command was changed to a small inline Node HTTP server so the sample stack can run as written.

## Review Notes
- The post uses the legacy `docker-compose.yml` and `docker-compose.override.yml` filenames. Docker Compose still supports these for backward compatibility, although current Docker documentation prefers `compose.yaml` and `compose.override.yaml`.
- The short `depends_on` syntax starts services in dependency order but does not wait for dependency services to become healthy. That is acceptable for this simple tutorial, but production examples should use health checks where service readiness matters.
