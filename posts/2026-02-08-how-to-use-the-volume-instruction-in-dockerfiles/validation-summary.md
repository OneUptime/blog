# Validation Summary: How to Use the VOLUME Instruction in Dockerfiles

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Docker
- Dockerfiles
- Docker volumes
- Docker Compose volumes
- Docker CLI
- PostgreSQL and MySQL container storage examples

## Sources Consulted
- Dockerfile reference, VOLUME instruction: https://docs.docker.com/reference/dockerfile/#volume
- Docker volumes documentation: https://docs.docker.com/engine/storage/volumes/
- Docker bind mounts documentation: https://docs.docker.com/engine/storage/bind-mounts/
- Docker CLI reference, docker container run: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Compose file volumes reference: https://docs.docker.com/reference/compose-file/volumes/
- Docker Official Image documentation for Postgres: https://github.com/docker-library/docs/blob/master/postgres/README.md
- Local Docker CLI help output for `docker run` and `docker volume`

## Issues Found
- The post stated that changes made to a VOLUME path after the `VOLUME` instruction are always discarded. Docker's official Dockerfile reference says this is true for the legacy builder, but BuildKit keeps those changes. Updated the explanation, example comments, and summary to describe the builder-specific behavior.

## Review Notes
The Dockerfile syntax, Docker CLI examples, Compose volume snippet, anonymous and named volume behavior, bind mount caveat, volume initialization behavior, tmpfs recommendation, and volume cleanup commands were otherwise consistent with official Docker documentation. The post now uses the conservative recommendation of writing initialization content before `VOLUME` so the Dockerfile behaves predictably across builders.
