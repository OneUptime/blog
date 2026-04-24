# Validation Summary: How to Fix Portainer Memory Issues on Low-Resource Hosts - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer Community Edition (CE)
- Portainer Agent / Edge Agent
- Docker Engine
- Docker Compose
- cAdvisor
- Linux swap configuration
- Raspberry Pi / ARM deployments

## Sources Consulted
- Portainer CLI configuration options: https://docs.portainer.io/advanced/cli
- Portainer application settings and snapshot interval: https://docs.portainer.io/admin/settings/general
- Install Portainer CE with Docker on Linux: https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Install Portainer Agent on Docker Standalone: https://docs.portainer.io/admin/environments/add/docker/agent
- Portainer architecture overview: https://docs.portainer.io/start/architecture
- Portainer ARM architecture support FAQ: https://docs.portainer.io/faqs/installing/which-arm-architectures-does-portainer-support
- Portainer lifecycle policy: https://docs.portainer.io/start/lifecycle
- Docker container resource constraints: https://docs.docker.com/engine/containers/resource_constraints/
- Docker Compose service reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose deploy reference: https://docs.docker.com/reference/compose-file/deploy/
- cAdvisor official README / quick start: https://github.com/google/cadvisor
- Portainer upstream source reviewed for flag behavior: https://github.com/portainer/portainer

## Issues Found
- The post used `portainer/portainer-ce:latest` and `portainer/agent:latest` throughout. I updated the examples to `:lts` to match Portainer's current installation guidance and production-oriented release stream.
- The Docker Compose example used `deploy.resources` as a generic local Compose example. I changed it to service-level `mem_limit`, `memswap_limit`, `mem_reservation`, and `cpus`, which are directly documented in Docker Compose for service containers.
- The snapshot tuning examples used invalid Portainer CLI values such as `--snapshot-interval=300` and `--snapshot-interval=600`. Portainer expects Go duration strings such as `10m`, and the original `300` example also incorrectly claimed to be longer than the default even though the default is 5 minutes.
- The Step 4 title was misleading because it described the change as "instead of Direct Docker Socket" while the body actually compared running an Agent versus running the full Portainer Server on the low-resource host. I corrected the heading and added the current Portainer docs note that the Edge Agent is recommended for most new remote deployments.
- The claim that the standard Agent "typically uses only 20-50 MB RAM" versus "200+ MB" for the full server was not supported by current official Portainer documentation. I replaced it with a source-backed explanation that the Agent is stateless and lighter than running the full server on the same host.
- The environment-management step suggested setting environments to "inactive" if available. I removed that instruction because it is not reflected in current Portainer environment-management documentation.
- The Raspberry Pi / ARM section was mislabeled as an Agent step even though it showed the full Portainer Server image. I corrected the heading, aligned the image tag, fixed the snapshot interval flag, restored the default HTTPS port exposure, and updated the ARM guidance to note ARM64 primary support, ARMv7 availability, and lack of support for ARMv6 and below.
- The cAdvisor example used the outdated `gcr.io/cadvisor/cadvisor:latest` image reference. I replaced it with the current upstream quick-start pattern using `ghcr.io/google/cadvisor` and the required mounts / flags documented by the project.
- The BoltDB compaction example treated `--compact-db` like a one-shot maintenance command run in a temporary container. Portainer actually compacts the database during normal startup, so I changed the example to a standard startup command with `--compact-db`.
- The explanation "Docker environment snapshots (stored in-memory cache)" was too specific for what the current docs explicitly state. I simplified that wording to avoid overstating Portainer internals.

## Review Notes
- Docker was not installed in the review workspace, so command and flag validation was done against official Docker and Portainer documentation plus upstream Portainer source, not local `docker --help` output.
- Using the `lts` tag is appropriate for a practical self-hosted guide, but pinning an exact LTS patch version would be better if strict reproducibility is required.
- Portainer currently recommends the Edge Agent for most new remote deployments. The post now notes that recommendation while keeping the standard Agent example because it remains valid when port `9001` is reachable from the server.
