# Validation Summary: How to Use Compose Networks with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman
- podman-compose
- Compose Specification
- Container networking
- Podman bridge networks, IPAM, external networks, static IPs, and network aliases

## Sources Consulted
- Compose Specification: https://compose-spec.github.io/compose-spec/spec.html
- Podman `podman compose` documentation: https://docs.podman.io/en/v5.6.2/markdown/podman-compose.1.html
- Podman `podman network create` documentation: https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Upstream `podman-compose` README: https://github.com/containers/podman-compose
- Upstream `podman-compose` implementation: https://github.com/containers/podman-compose/blob/main/podman_compose.py

## Issues Found
- The Compose examples used the obsolete top-level `version: "3.8"` field. I removed it and changed the file comments from `docker-compose.yml` to the current preferred `compose.yaml` name because the Compose Specification marks `version` as obsolete and lists `compose.yaml` as the preferred default file.
- The verification commands used generated container names such as `project_web_1` with `podman exec`. I changed them to `podman-compose exec <service> ...` so the commands address services by Compose service name instead of relying on project-directory-dependent generated container names.

## Review Notes
- The local environment did not have `podman` or `podman-compose` installed, so runtime execution was not possible. Verification used the Compose Specification, Podman official documentation, and upstream `podman-compose` source.
- The documented network keys `networks`, `name`, `driver`, `ipam.config.subnet`, `ipam.config.gateway`, service-level `ipv4_address`, `external`, and service network `aliases` match current Compose and `podman-compose` behavior.
