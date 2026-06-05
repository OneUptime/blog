# Validation Summary: How to Debug Why Docker Compose Services Won't Start

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Docker Compose
- Docker CLI
- Docker containers
- Docker images
- Docker bind mounts and volumes
- Docker networking
- Docker health checks
- Linux process exit codes and OOM diagnostics
- YAML Compose configuration

## Sources Consulted
- Docker Compose CLI reference: `docker compose ps` - https://docs.docker.com/reference/cli/docker/compose/ps/
- Docker Compose CLI reference: `docker compose logs` - https://docs.docker.com/reference/cli/docker/compose/logs/
- Docker Compose CLI reference: `docker compose down` - https://docs.docker.com/reference/cli/docker/compose/down/
- Docker Compose file reference: services, `depends_on`, `entrypoint`, `environment`, `networks`, and volume syntax - https://docs.docker.com/reference/compose-file/services/
- Docker Compose file reference: networks - https://docs.docker.com/reference/compose-file/networks/
- Docker Compose Deploy Specification: `deploy.resources.limits.memory` - https://docs.docker.com/reference/compose-file/deploy/
- Docker Engine storage documentation: bind mounts - https://docs.docker.com/engine/storage/bind-mounts/
- Local Docker Compose CLI help output for `ps`, `logs`, `config`, `down`, `images`, `pull`, and `run`.
- Local Docker CLI help output for `docker inspect`.

## Issues Found
- The image-checking comment said `docker compose images` checks whether an image exists locally. Docker documents this command as listing images used by created containers, so the comment was updated to avoid implying it checks all service image references before creation.
- The bind mount section said a missing host directory causes a bind source path error. Docker Compose short syntax creates missing host directories for backward compatibility, while missing-path errors are more applicable to missing files, unavailable host paths, or long syntax bind mounts with host-path creation disabled. The explanation and fix wording were updated.
- The network debugging section used `docker network inspect $(docker compose ps -q api | head -1)`, but `docker compose ps -q` returns a container ID, not a network ID. The command was replaced with `docker inspect ... .NetworkSettings.Networks` to inspect the container's attached networks.
- The cleanup section overstated `docker compose down -v --remove-orphans` as removing all resources and described `docker compose down --rmi all` as removing cached images. Docker documents `down` as removing project containers, networks, and optionally volumes/images used by services, so the comments were corrected.
- The checklist used `docker compose config --volumes` for checking volume mounts. That flag lists named volume names, not the full service mount configuration. It was replaced with `docker compose config` to review resolved mount configuration.

## Review Notes
The guide is technically sound after the corrections. Some commands such as `ping`, `nslookup`, `nc`, `lsof`, `ss`, `dmesg`, and `journalctl` depend on host OS, permissions, and packages available inside the container image, but their usage is appropriate as troubleshooting examples.
