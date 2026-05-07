# Validation Summary: How to Choose Between podman-compose and Docker Compose

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Compose
- Podman
- podman-compose
- Compose Specification
- BuildKit
- Buildah
- SELinux bind mount labels
- Podman Docker-compatible API socket

## Sources Consulted
- Docker Docs: Compose file reference and obsolete `version` field: https://docs.docker.com/reference/compose-file/version-and-name/
- Compose Specification: Compose file names, `depends_on`, `deploy`, `profiles`, and volume SELinux options: https://compose-spec.github.io/compose-spec/spec.html
- Docker Docs: `docker compose up` and `docker compose build` CLI references: https://docs.docker.com/reference/cli/docker/compose/up/ and https://docs.docker.com/reference/cli/docker/compose/build/
- Docker Docs: BuildKit overview: https://docs.docker.com/build/buildkit/
- Docker Docs: bind mount SELinux labels: https://docs.docker.com/engine/storage/bind-mounts/
- Podman documentation: `podman compose` external provider behavior: https://docs.podman.io/en/v5.3.0/markdown/podman-compose.1.html
- podman-compose upstream README: https://github.com/containers/podman-compose
- Podman documentation: `podman build` uses Buildah code: https://docs.podman.io/en/v4.8.0/markdown/podman-build.1.html
- Podman documentation: network backends Netavark and CNI: https://docs.podman.io/en/v4.6.1/markdown/podman-network.1.html
- Podman documentation: Docker-compatible API socket: https://docs.podman.io/en/latest/markdown/podman-system-service.1.html
- Local Docker Compose CLI help for `docker compose up`, `docker compose build`, and `docker compose version`.

## Issues Found
- The example Compose file used `version: "3.9"`. Current Docker Compose treats the top-level `version` field as obsolete and only informative, so I removed it from the example.
- The post described `:Z` as Podman-specific and ignored by Docker Compose. The Compose Specification and Docker documentation define SELinux `z` and `Z` bind mount options, so I updated the wording to say both Docker and Podman support it on SELinux-enabled hosts.
- The post said Docker Compose with the Podman socket gives Docker Compose's full feature set. Podman exposes a Docker-compatible API, but behavior can still differ from Docker Engine, so I softened this claim.
- The podman-compose installation example used `pip` and `sudo pip`. Upstream documentation uses `pip3` and also documents distribution packages, so I updated the example to use `pip3` and `apt`.
- The post said podman-compose has no additional dependencies. Upstream documentation lists Podman, Python packages, and in some CNI setups the dnsname plugin, so I changed this to say it avoids Docker and the Docker daemon.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. podman-compose feature support changes over time, and current upstream code includes support for some features the post describes as potentially unsupported, such as profiles and health-based dependency conditions. The cautious "may not" wording remains acceptable, but future revisions could compare specific podman-compose versions rather than describing support generically.
