# Validation Summary: Understanding Docker Restart Policies: always, unless-stopped, and on-failure

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker Engine
- Docker CLI
- Docker restart policies
- Docker Compose
- Container health checks

## Sources Consulted
- Docker Docs: Start containers automatically - https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs: docker container run reference, restart policies - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: docker container update reference - https://docs.docker.com/reference/cli/docker/container/update/
- Docker Docs: Compose services reference, restart attribute - https://docs.docker.com/reference/compose-file/services/#restart
- Docker Docs: Compose version top-level element - https://docs.docker.com/reference/compose-file/version-and-name/
- Local Docker CLI help from Docker 29.4.2 for `docker run --restart` and `docker update --restart`

## Issues Found
- The Compose example used `version: '3.8'`. Current Docker Compose treats the top-level `version` property as obsolete and only informative, so I removed it from the snippet.
- The restart backoff sequence said the first restart is immediate. Docker's run reference documents the increasing delay as starting at 100 ms, then 200 ms, 400 ms, and so on up to 1 minute, so I corrected the sequence.
- The post said the restart count resets after a container runs successfully for 10 seconds. Docker documents that the restart backoff delay resets after a successful 10-second run; `.RestartCount` is a container inspection field and is reset by recreating the container. I changed the section title and wording accordingly.

## Review Notes
The remaining Docker CLI commands, restart policy names, `on-failure[:max-retries]` syntax, `docker update --restart` examples, Compose `restart` values, and health check flags matched Docker's current official documentation.
