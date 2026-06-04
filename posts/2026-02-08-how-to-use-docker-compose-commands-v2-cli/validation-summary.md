# Validation Summary: How to Use docker compose Commands (v2 CLI)

## Status
validated

## Post Type
Technical guide / CLI reference

## Technologies Covered
- Docker
- Docker Compose v2 CLI
- Compose files
- Compose profiles
- Compose health checks and `depends_on`
- Compose Watch
- Compose environment variable interpolation

## Sources Consulted
- Docker Compose overview: https://docs.docker.com/compose/
- Docker Compose CLI reference: https://docs.docker.com/reference/cli/docker/compose/
- `docker compose up` CLI reference: https://docs.docker.com/reference/cli/docker/compose/up/
- `docker compose down` CLI reference: https://docs.docker.com/reference/cli/docker/compose/down/
- `docker compose ps` CLI reference: https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker Compose profiles documentation: https://docs.docker.com/compose/how-tos/profiles/
- Compose services reference for `depends_on`, `healthcheck`, `develop`, `image`, and `volumes`: https://docs.docker.com/reference/compose-file/services/
- Compose Watch documentation: https://docs.docker.com/compose/how-tos/file-watch/
- Compose Develop Specification: https://docs.docker.com/reference/compose-file/develop/
- Compose environment variable interpolation documentation: https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/
- Compose `version` top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker blog on Compose v2 and v1 deprecation: https://www.docker.com/blog/new-docker-compose-v2-and-v1-deprecation/

## Issues Found
- The post said `docker compose down` removes containers, networks, and volumes created by `up`. Docker's official `down` reference states that volumes are not removed by default. Updated the wording to say `down` removes containers and networks, while the existing `down -v` example covers volume removal.
- The post described `docker compose down --rmi all` as removing "everything including images." This could imply volumes are removed too, which is not true unless `-v` is used. Updated the wording to "containers, networks, and service images."
- The Compose example used the top-level `version: "3.8"` field. Docker's current Compose Specification documents the `version` field as obsolete and only retained for backward compatibility. Removed it from the example.
- The post said Compose Watch automatically rebuilds and restarts services when source files change. Docker's Compose Watch documentation distinguishes actions such as `sync`, `rebuild`, and `sync+restart`. Updated the wording to describe those behaviors more accurately.
- The conclusion said the watch command replaces external file-watching tools. Docker describes Compose Watch as development assistance and a companion to other workflows, not a universal replacement. Updated the wording to "can reduce the need."
- The conclusion said migration from v1 is simply replacing `docker-compose` with `docker compose`. Docker's migration guidance notes edge cases around command flags, environment variables, and container naming. Updated the wording to recommend checking migration notes after replacing the command.

## Review Notes
The remaining commands and snippets are consistent with the current Docker Compose CLI and Compose Specification. The `.env` behavior is accurate for common usage, but Docker's current documentation includes nuanced precedence rules involving the working directory, project directory, `--env-file`, and `COMPOSE_ENV_FILES`; a future article could expand that section.
