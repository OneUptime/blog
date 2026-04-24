# Validation Summary: How to Deploy Uptime Kuma via Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Uptime Kuma
- Docker Compose
- Docker volumes
- Traefik
- Slack webhooks
- Discord webhooks

## Sources Consulted
- Portainer stack deployment docs: https://docs.portainer.io/user/docker/stacks/add
- Portainer stack editing docs: https://docs.portainer.io/sts/user/docker/stacks/edit
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Uptime Kuma official repository README: https://github.com/louislam/uptime-kuma
- Uptime Kuma Docker tags wiki: https://github.com/louislam/uptime-kuma/wiki/Docker-Tags
- Uptime Kuma migration guide for v1 to v2: https://github.com/louislam/uptime-kuma/wiki/Migration-From-v1-To-v2
- Uptime Kuma Docker monitoring wiki: https://github.com/louislam/uptime-kuma/wiki/How-to-Monitor-Docker-Containers
- Uptime Kuma notification methods wiki: https://github.com/louislam/uptime-kuma/wiki/Notification-Methods
- Uptime Kuma status page wiki: https://github.com/louislam/uptime-kuma/wiki/Status-Page
- Docker Compose network reference: https://docs.docker.com/reference/compose-file/networks/
- Docker `volume inspect` reference: https://docs.docker.com/reference/cli/docker/volume/inspect/
- Traefik Docker provider docs: https://doc.traefik.io/traefik/v3.3/providers/docker/
- Traefik Docker routing docs: https://doc.traefik.io/traefik/v3.3/routing/providers/docker/

## Issues Found
- The post used `louislam/uptime-kuma:1`, but the current official recommended Docker tag for new deployments is `louislam/uptime-kuma:2`. I updated the Compose snippet and related deployment/update text to use `:2`.
- The prerequisites said Traefik should be configured with a `web` entrypoint, while the actual labels used `websecure`. I corrected the prerequisite to match the configuration shown in the Compose example.
- The Traefik example attached the container to both `monitoring` and `traefik-public` networks but omitted `traefik.docker.network`. Traefik's docs require setting this when a container is on multiple networks to avoid Traefik picking the wrong network. I added `traefik.docker.network=traefik-public`.
- The Traefik example relied on an external `traefik-public` network without stating that it must already exist. I clarified that prerequisite directly below the Compose snippet.
- The update instructions referenced **Pull and redeploy**, which is not the standard edit flow for a stack initially created from Portainer's Web Editor. I updated the instructions to use the **Editor** tab and **Update the stack**, with a note about the `Re-pull image` / `Pull latest image` option where available.
- The persistent storage section said the volume stores `kuma.db` and SSL certificates. I adjusted that wording to the more accurate `kuma.db` and other runtime data.

## Review Notes
- The published `3001:3001` port is optional when Traefik is the only intended entrypoint. The post now notes that the port mapping can be removed when direct access is not needed.
- Mounting `/var/run/docker.sock` enables Docker container monitoring, but it also grants Uptime Kuma significant access to the Docker daemon. That tradeoff is documented by Uptime Kuma and should be considered in production deployments.
