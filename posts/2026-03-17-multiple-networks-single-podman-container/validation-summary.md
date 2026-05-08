# Validation Summary: How to Use Multiple Networks with a Single Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Container networking
- Podman user-defined networks
- PostgreSQL container image
- Nginx container image

## Sources Consulted
- Podman run documentation: https://docs.podman.io/en/latest/markdown/podman-run.1.html
- Podman network create documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman network connect documentation: https://docs.podman.io/en/latest/markdown/podman-network-connect.1.html
- Podman network disconnect documentation: https://docs.podman.io/en/stable/markdown/podman-network-disconnect.1.html
- Podman network ls documentation: https://docs.podman.io/en/latest/markdown/podman-network-ls.1.html
- Podman exec documentation: https://docs.podman.io/en/latest/markdown/podman-exec.1.html
- Docker Official Image documentation for Postgres: https://hub.docker.com/_/postgres/

## Issues Found
- The PostgreSQL example placed `-e POSTGRES_PASSWORD=secret` after the image name. In `podman run`, options must be supplied before the image name; arguments after the image are passed as the container command. Moved the environment variable before `docker.io/library/postgres:16-alpine`.
- The interface verification comments mapped `eth0` and `eth1` to specific networks. Podman commonly uses sequential interface names, but the exact names and ordering should not be presented as guaranteed unless explicitly configured. Updated the wording to say Podman typically names them `eth0`, `eth1`, and so on.

## Review Notes
The multiple `--network` usage, `podman network connect`, `podman network disconnect`, `podman network create`, `podman network ls`, and `podman exec` commands align with current Podman documentation. Container-name DNS resolution depends on DNS being enabled for the user-defined bridge network, which is the default for typical Podman bridge networks unless disabled.
