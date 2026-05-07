# Validation Summary: How to Migrate Docker Swarm Services to Podman

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Docker Swarm
- Docker CLI
- Docker Compose stack files
- Podman
- Podman pods
- Podman Quadlet and systemd
- Podman secrets
- Kubernetes
- NGINX load balancing

## Sources Consulted
- Docker CLI reference for `docker stack config`: https://docs.docker.com/reference/cli/docker/stack/config/
- Docker CLI reference for `docker secret inspect`: https://docs.docker.com/reference/cli/docker/secret/inspect/
- Docker Swarm secrets documentation: https://docs.docker.com/engine/swarm/secrets/
- Podman `generate` command documentation: https://docs.podman.io/en/latest/markdown/podman-generate.1.html
- Podman `kube generate` documentation: https://docs.podman.io/en/v5.8.0/markdown/podman-kube-generate.1.html
- Podman Quadlet systemd unit documentation: https://docs.podman.io/en/latest/markdown/podman-systemd.unit.5.html
- Podman pod creation documentation: https://docs.podman.io/en/stable/markdown/podman-pod-create.1.html
- Podman secret creation documentation: https://docs.podman.io/en/latest/markdown/podman-secret-create.1.html
- Podman container secret option documentation: https://docs.podman.io/en/latest/markdown/podman-create.1.html

## Issues Found
- `docker stack config mystack` was incorrect. The current Docker CLI takes Compose files with `--compose-file`, so the command was changed to `docker stack config --compose-file docker-compose.yml > /tmp/swarm-stack.yml`.
- The systemd section used `podman generate systemd`, which current Podman documentation marks as deprecated. The example was updated to use Quadlet `.pod`, `.container`, and `.volume` files under `~/.config/containers/systemd/`, and to enable/start the generated pod and container services.
- The NGINX load balancer example pointed upstream servers at port `8080`, but the earlier Swarm example maps host port `8080` to container port `80`. The upstream ports were changed to `80`.
- The Kubernetes Deployment and Service example used container and target port `8080` for the web container, but the source Swarm service exposes container port `80`. The example was corrected to `containerPort: 80` and `targetPort: 80`.
- The Podman Kubernetes generation command was updated from `podman generate kube` to the current documented `podman kube generate` form.
- The Swarm secrets section attempted to export secret data using `docker secret inspect ... .Spec.Data`, but Docker secret inspection metadata does not include the secret value. The example now states that Docker does not expose the value and recreates the Podman secret from the original source value.
- The Podman secret creation example used `echo`, which can add a trailing newline to the secret. It was changed to `printf '%s'`.
- The summary referred to systemd service generation and `generate kube`; it was updated to describe Quadlet with systemd and `kube generate`.

## Review Notes
Podman was not installed in the local environment, so Podman commands were checked against official Podman documentation rather than local `--help` output. Docker CLI help was available locally and matched the official Docker documentation for the reviewed commands.
