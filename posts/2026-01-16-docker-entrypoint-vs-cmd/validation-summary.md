# Validation Summary: How to Understand Docker Entrypoint vs CMD (and When to Use Each)

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Docker
- Dockerfile `ENTRYPOINT` and `CMD`
- Docker CLI `docker run` and `docker inspect`
- Bash entrypoint scripts
- Node.js Docker images
- Python Docker images
- Alpine Linux and Ubuntu base images

## Sources Consulted
- Docker Docs: Dockerfile reference, including `CMD`, `ENTRYPOINT`, exec form, shell form, and their interaction: https://docs.docker.com/reference/dockerfile/
- Docker Docs: Running containers, including `[COMMAND] [ARG...]` and `--entrypoint` behavior: https://docs.docker.com/engine/containers/run/
- Docker Docs: `JSONArgsRecommended` build check for exec-form guidance and signal-handling rationale: https://docs.docker.com/reference/build-checks/json-args-recommended/
- Docker Docs: Building best practices for `ENTRYPOINT` as the main command and `CMD` as default flags: https://docs.docker.com/build/building/best-practices/
- Alpine Linux official releases page for supported release branches: https://alpinelinux.org/releases/
- Node.js official previous releases page for supported LTS guidance: https://nodejs.org/en/about/previous-releases
- Local Docker CLI verification with Docker 29.4.2: `docker run --help`, test images for `ENTRYPOINT`/`CMD` override behavior, and nginx option help.

## Issues Found
- The `--entrypoint` example said Docker ignores `CMD`. I clarified that `docker run --entrypoint ...` clears the image's default `CMD`, matching Docker's documented behavior.
- The Python interactive example used `docker run -it myapp`, which would still run the default `CMD ["app.py"]`. I changed it to `docker run -it myapp -i` so the positional command overrides `CMD` and starts Python interactively.
- The Node.js wrapper example used `node:18-slim`, which is end-of-life as of the review date, and relied on `nc` plus an executable entrypoint script without installing netcat or ensuring executable permissions. I updated it to `node:22-slim` and added installation of `netcat-openbsd`, `chmod +x`, and apt cache cleanup.
- The Alpine examples used `alpine:3.19`, which is no longer supported as of the review date. I updated them to `alpine:3.24`, the current supported branch.
- The configurable-port example used nginx `-p` as if it configured the listen port, but nginx documents `-p` as the prefix path option. I changed the example to a generic Python application with a `--port` argument so the ENTRYPOINT/CMD lesson remains accurate.

## Review Notes
The core explanation of exec form versus shell form, `CMD` as default arguments to exec-form `ENTRYPOINT`, shell-form signal caveats, and `exec "$@"` in entrypoint scripts matches Docker's official documentation. Future improvements could mention that wrapper scripts which start multiple long-running child processes may need explicit signal traps or a minimal init process such as Docker's `--init`.
