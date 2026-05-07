# Validation Summary: How to Migrate from Docker Swarm to Podman

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Docker Swarm
- Docker services, configs, secrets, and stack files
- Podman containers, networks, secrets, health checks, and auto-update
- Podman Quadlet systemd units
- systemd user services and timers
- Nginx and HAProxy reverse proxying
- Kubernetes, k3s, k0s, Ansible, and Terraform as migration alternatives

## Sources Consulted
- Docker CLI reference for `docker service inspect`: https://docs.docker.com/reference/cli/docker/service/inspect/
- Docker CLI reference for `docker config create`: local Docker CLI help, Docker 29.4.2
- Docker Swarm secrets documentation: https://docs.docker.com/engine/swarm/secrets/
- Docker Swarm configs documentation: https://docs.docker.com/engine/swarm/configs/
- Docker Compose Deploy Specification: https://docs.docker.com/reference/compose-file/deploy/
- Podman `podman secret create` documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Podman `podman run` documentation for `--secret`: https://docs.podman.io/en/v5.4.1/markdown/podman-run.1.html
- Podman Quadlet/systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman container Quadlet documentation: https://docs.podman.io/en/latest/markdown/podman-container.unit.5.html
- Podman auto-update documentation: https://docs.podman.io/en/v4.9.0/markdown/podman-auto-update.1.html
- Podman healthcheck run documentation: https://docs.podman.io/en/latest/markdown/podman-healthcheck-run.1.html

## Issues Found
- The Podman auto-update example showed a standalone `podman run` command using `--label io.containers.autoupdate=registry` with the short image name `my-api:latest`. Podman auto-update is intended for containers managed by systemd units, and the `registry` policy requires a fully qualified image reference. I changed the example to describe a systemd-managed Quadlet container and use `Image=registry.example.com/my-api:latest` with `AutoUpdate=registry`.

## Review Notes
- Podman was not installed in the local workspace, so Podman-specific syntax was checked against official Podman documentation rather than local `--help` output.
- The rootless Quadlet examples publish host port 80. That is valid in rootful mode, but rootless deployments may need host configuration or a higher host port depending on the operating system's privileged-port settings.
