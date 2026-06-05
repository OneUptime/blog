# Validation Summary: How to Fix Docker Compose Services Not Finding Each Other by Name

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Docker Compose
- Docker Engine networking
- Docker bridge networks
- Docker embedded DNS
- Compose service health checks
- PostgreSQL and Redis container health checks
- Java DNS cache configuration

## Sources Consulted
- Docker Docs: Networking in Compose - https://docs.docker.com/compose/how-tos/networking/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Compose file services reference - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose file networks reference - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: docker compose config CLI reference - https://docs.docker.com/reference/cli/docker/compose/config/
- Docker Docs: docker network inspect CLI reference - https://docs.docker.com/reference/cli/docker/network/inspect/
- Local Docker Compose CLI help for `docker compose config` and `docker network inspect`.

## Issues Found
- The host networking workaround described the wrong direction too broadly. I clarified that containers reaching a host-networked service must use the host address, while a host-networked service reaching another Compose service needs that service's port published on the host.
- The Redis health check was described as a generic TCP check, but the snippet uses `redis-cli ping`, which is an application-level Redis check. I updated the wording and code comment.
- The post implied that using a container name instead of a service name is simply wrong for DNS. On user-defined Docker networks, container names can be resolvable, but they are brittle in Compose and custom `container_name` values can conflict and prevent scaling. I changed the text to recommend stable service names without making the inaccurate DNS claim.
- The diagnostic `docker network inspect` command printed Compose network keys, which may not match the actual Docker network names. I changed the Python snippet to print the rendered network `name` from `docker compose config --format json`.
- The summary said a failed connection after successful DNS resolution means the target application is not ready. I changed this to "may not be ready" because other causes, such as wrong port or listener configuration, can also produce connection failures.

## Review Notes
Most examples and claims were consistent with current Docker documentation: Compose creates a project-specific default network, services on the same Compose network are discoverable by service name, default bridge networking does not provide automatic service-name DNS, host networking disables Compose service-name DNS, `depends_on.condition: service_healthy` is valid in current Compose, and network aliases are valid per-network alternative hostnames. Some diagnostic commands depend on tools being installed inside the target image, such as `nslookup`, `ping`, `nc`, or shell `/dev/tcp` support.
