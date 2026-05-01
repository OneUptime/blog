# Validation Summary: How to Use Docker Compose to Assign Static IPv4 Addresses to Services

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker
- Docker Compose
- IPv4
- Container networking
- Docker bridge networks

## Sources Consulted
- Docker Docs, Compose file `services` reference (`ipv4_address`): https://docs.docker.com/reference/compose-file/services/
- Docker Docs, Compose file `networks` reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Docs, Compose file `version` top-level element: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs, `docker compose ps` CLI reference: https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker Docs, `docker inspect` CLI reference: https://docs.docker.com/reference/cli/docker/inspect/
- BusyBox `hostname` applet reference: https://busybox.net/BusyBox.html

## Issues Found
- The Compose example included the top-level `version: "3.8"` field. Current Docker documentation marks `version` as obsolete and only retained for backward compatibility, so I removed it.
- The verification commands used `docker compose exec ... hostname -I`. That check depends on utilities inside the container image and is not reliable for the Alpine-based images used in the post. I replaced those commands with Docker-native `docker inspect` commands using the container IDs returned by `docker compose ps -q`.
- The service-discovery explanation implied service names resolve universally. Docker’s documentation makes that behavior network-scoped, so I clarified that name-based resolution applies to services on the same Docker/Compose network.

## Review Notes
- The static IPv4 examples themselves are correct: Docker Compose supports `ipv4_address` on a service’s network attachment when the corresponding network has an `ipam` subnet covering the chosen address.
- The multi-network example is also valid as written because each static IP falls within a distinct configured subnet.
- Docker is not installed in this review environment, so command execution was validated against official CLI documentation rather than by running the examples locally.
