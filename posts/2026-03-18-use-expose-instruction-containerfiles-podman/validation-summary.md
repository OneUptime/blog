# Validation Summary: How to Use EXPOSE Instruction in Containerfiles for Podman

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Podman
- Containerfile / Dockerfile syntax
- EXPOSE instruction
- Podman port publishing
- Podman pods and shared networking
- PostgreSQL container image

## Sources Consulted
- Podman `podman-create` / `podman run` documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html
- Podman `podman-run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-pod-create` documentation: https://docs.podman.io/en/latest/markdown/podman-pod-create.1.html
- Dockerfile reference for `EXPOSE`, `ARG`, `ENV`, and variable substitution: https://docs.docker.com/reference/dockerfile/
- Docker Official Image documentation for PostgreSQL: https://hub.docker.com/_/postgres/

## Issues Found
- The automatic port publishing example ran `podman run -P myapp` and then used `podman port myapp`. `podman port` needs a container name or ID, while `myapp` was used as the image name in the example. Changed the command to run the container detached with `--name myapp-container` and inspect `podman port myapp-container`.
- The Podman pod example started `postgres:16-alpine` without setting `POSTGRES_PASSWORD`. The official PostgreSQL image requires a superuser password unless another supported authentication configuration is used. Added `-e POSTGRES_PASSWORD=example` to make the example runnable.

## Review Notes
- The main explanation of `EXPOSE` is correct: it documents intended listening ports and does not publish ports by itself; `-p` or `-P` is required for host access.
- The `EXPOSE ${PORT}` example is valid because Dockerfile/Containerfile environment variable substitution supports `EXPOSE`.
- Podman was not installed in the local environment, so command behavior was verified against official Podman documentation rather than local `podman --help` output.
