# Validation Summary: How to Enable Container-to-Container Communication in Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Podman container networking
- DNS-based container discovery
- PostgreSQL container image
- Redis container image
- Alpine Linux containers

## Sources Consulted
- Podman `podman-network-create` official documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Podman `podman-run` official documentation: https://docs.podman.io/en/v5.6.1/markdown/podman-run.1.html
- Podman `podman-network-inspect` official documentation: https://docs.podman.io/en/v5.7.1/markdown/podman-network-inspect.1.html
- Podman `podman-network` official documentation: https://docs.podman.io/en/latest/markdown/podman-network.1.html
- Docker Hub PostgreSQL Official Image documentation: https://hub.docker.com/_/postgres/
- Docker Hub Redis Official Image documentation: https://hub.docker.com/_/redis/

## Issues Found
- The opening blockquote said containers on the same Podman network can reach each other by name or IP without extra configuration. This was too broad because official Podman documentation shows the default `podman` network has DNS disabled, while `podman network create` creates a DNS-capable bridge network unless DNS is disabled. Changed the claim to refer specifically to user-defined Podman networks.

## Review Notes
The commands and flags used in the post are current and valid according to the official Podman documentation. `podman network create app-net`, `--network`, `--network-alias`, `podman exec`, and DNS-enabled name or alias resolution on user-defined bridge networks are documented behavior. The PostgreSQL and Redis image references are plausible current official image tags. The PostgreSQL readiness command may fail briefly if run before PostgreSQL finishes initializing, but the command itself is correct.
