# Validation Summary: How to Expose Container Ports and Bind to Specific IPv4 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker Compose
- IPv4 networking
- Container port publishing
- `dockerd` daemon configuration
- pgAdmin container deployment

## Sources Consulted
- Docker Docs, "Port publishing and mapping": https://docs.docker.com/engine/network/port-publishing/
- Docker Docs, "`docker container run`" CLI reference: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs, "`docker container port`" CLI reference: https://docs.docker.com/reference/cli/docker/container/port/
- Docker Docs, Compose file reference for `services.ports`: https://docs.docker.com/reference/compose-file/services/
- pgAdmin 4 docs, "Container Deployment": https://www.pgadmin.org/docs/pgadmin4/latest/container_deployment.html

## Issues Found
- The introduction and some example comments treated host-IP publishing as interface-only access control and described Docker's default bind as only `0.0.0.0`. Docker's current docs state that an unspecified host IP publishes to all host addresses, including IPv6 (`[::]`) where applicable. I corrected the wording and relabeled the explicit `0.0.0.0` example as an IPv4-specific form rather than a full equivalent of the default.
- The Docker Compose `db-admin` example used `pgadmin4:latest`, which is not the official pgAdmin image reference, and it omitted required startup environment variables. I changed the image to `dpage/pgadmin4:latest` and added `PGADMIN_DEFAULT_EMAIL` and `PGADMIN_DEFAULT_PASSWORD` so the example is runnable.
- The `daemon.json` example used `tee -a`, which can create invalid JSON by appending a second top-level object, and it claimed the `"ip"` setting changes the default for all containers. Docker documents that `"ip"` affects published-port binding on the default bridge network. I changed the example to create a valid JSON file, added a note about merging into an existing config, and corrected the scope.

## Review Notes
- Docker documents a version caveat for localhost publishing: in releases older than 28.0.0, hosts on the same L2 segment could reach ports published to `127.0.0.1`. The post is now accurate for current Docker behavior.
- The post remains intentionally IPv4-focused. On current Docker releases, publishing without an explicit host IP is dual-stack by default when IPv6 is enabled on the host.
