# Validation Summary: How to Install Portainer Using Docker Run Command

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer Community Edition (CE)
- Docker Engine
- `docker run`
- Docker named volumes
- HTTPS/HTTP port publishing

## Sources Consulted
- Portainer Documentation: Install Portainer CE with Docker on Linux - https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer Documentation: Initial setup - https://docs.portainer.io/start/install-ce/server/setup
- Portainer Documentation: Updating on Docker Standalone - https://docs.portainer.io/start/upgrade/docker
- Docker Docs: Start containers automatically - https://docs.docker.com/engine/containers/start-containers-automatically/
- Docker Docs: `docker container run` reference - https://docs.docker.com/reference/cli/docker/container/run

## Issues Found
- The post used `portainer/portainer-ce:latest` for both install commands. I changed this to `portainer/portainer-ce:lts` to match Portainer's current official Docker installation guidance.
- The prerequisites section did not account for port `8000`, even though the main `docker run` command published it. I updated the prerequisites to reflect that `8000` is optional for Edge agents and that `9000` is only needed for legacy HTTP access.
- The install section described port `8000` as a generic agent communication port. I corrected this to the more precise Portainer terminology: the optional Edge agent tunnel port.
- The access instructions implied `https://localhost:9443` was universally correct. I added a note that remote access should use the Docker host's IP address or FQDN instead of `localhost`.
- The verification comment said `docker ps` confirms the container is "healthy". I changed this to "running" because `docker ps` verifies container state, not application health in this context.
- The sample `docker ps` output did not match the published ports in the command and still referenced the old image tag. I updated the example to reflect the `lts` image and both published ports shown in the install command.

## Review Notes
- The post remains technically relevant and salvageable after these corrections.
- Local `docker` CLI verification was not possible in the review environment because Docker was not installed, so command validation was performed against current official Docker and Portainer documentation.
