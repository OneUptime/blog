# Validation Summary: How to Install Portainer on Banana Pi

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Portainer CE
- Docker Engine
- Docker CLI
- Banana Pi
- ARM Linux
- Armbian
- Ubuntu
- Debian

## Sources Consulted
- Portainer Docs: Install Portainer CE with Docker on Linux - https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer Docs: Updating on Docker Standalone - https://docs.portainer.io/start/upgrade/docker
- Portainer Docs: Which ARM architectures does Portainer support? - https://docs.portainer.io/faqs/installing/which-arm-architectures-does-portainer-support
- Portainer Docs: Lifecycle policy - https://docs.portainer.io/start/lifecycle
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Start containers automatically - https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs: docker inspect reference - https://docs.docker.com/reference/cli/docker/inspect/

## Issues Found
- The install and update commands used `portainer/portainer-ce:latest`, but Portainer's current documented Docker standalone install and upgrade paths use `portainer/portainer-ce:lts`. Updated the install, troubleshooting, and update references to use `lts`.
- The "Verify Docker is running" step used `docker --version`, which only confirms the CLI is installed, not that the Docker daemon is running. Replaced it with `sudo systemctl enable --now docker` and `docker run hello-world`, matching Docker's installation verification guidance.
- The troubleshooting advice suggested `sudo chmod 666 /var/run/docker.sock`, which weakens local socket permissions and is not Docker's documented post-install fix. Replaced it with adding the user to the `docker` group and refreshing group membership with `newgrp docker`.
- The auto-start verification step used `docker ps -a`, which does not verify the configured restart policy. Replaced it with `docker inspect --format='{{.HostConfig.RestartPolicy.Name}}' portainer` so the command checks the restart policy directly.

## Review Notes
- Docker's `get.docker.com` convenience script is current and functional, but Docker documents it as intended for development and testing environments rather than production.
- Portainer's lifecycle guidance recommends the LTS release stream for production workloads, which is why the post now uses the `lts` image tag.
- Portainer's ARM images support ARM64, with ARMv7 also available. Builds below ARMv7 are not supported.
- Armbian is not explicitly listed in Docker's Ubuntu support matrix because it is a derivative distribution, so behavior can vary slightly by image release.
