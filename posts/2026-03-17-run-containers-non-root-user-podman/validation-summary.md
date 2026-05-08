# Validation Summary: How to Run Containers as a Non-Root User with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- Rootless containers and user namespaces
- Containerfile/Dockerfile `USER` and `COPY --chown`
- Bind-mounted volumes
- Podman secrets
- Nginx, PostgreSQL, and Redis container images

## Sources Consulted
- Podman `podman run` documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman top` documentation: https://docs.podman.io/en/latest/markdown/podman-top.1.html
- Podman `podman unshare` documentation: https://docs.podman.io/en/v5.5.2/markdown/podman-unshare.1.html
- Dockerfile reference for `USER` and `COPY --chown`: https://docs.docker.com/reference/dockerfile/
- NGINX unprivileged image documentation: https://github.com/nginx/docker-nginx-unprivileged
- Redis Docker Official Image documentation: https://hub.docker.com/_/redis
- PostgreSQL Docker Official Image documentation: https://github.com/docker-library/docs/blob/master/postgres/README.md

## Issues Found
- The volume-permissions example used `chmod 777 ./app-data`. While this can make a bind mount writable, it is unnecessarily permissive for a security-focused post. Replaced it with `podman unshare chown 1000:1000 ./app-data`, which aligns the host directory ownership with the rootless user namespace mapping.
- The host UID verification command used `podman top my-app user pid`, but Podman documents host-context descriptors with the `h*` prefix. Changed it to `podman top my-app huser hpid` so it shows host-context user and PID values.
- The command intended to verify that no process runs as root used `grep -v "^root" | wc -l`, which counts non-root process lines instead of detecting root-owned processes. Replaced it with `! ps -eo user= | grep -qx root`, which succeeds only when no process user is exactly `root`.

## Review Notes
The local environment did not have Podman installed, so CLI behavior was verified against the official Podman documentation rather than local `--help` output. The Redis and PostgreSQL examples depend on image entrypoint behavior, which can vary by major image version; pinning image versions is good practice for production examples.
