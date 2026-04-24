# Validation Summary: How to Install Portainer on Raspberry Pi 4

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Raspberry Pi 4
- Raspberry Pi OS
- Docker Engine
- Portainer CE
- Docker Compose / Portainer Stacks
- Home Assistant Container
- Pi-hole

## Sources Consulted
- Portainer CE install with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer update on Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer lifecycle policy: https://docs.portainer.io/start/lifecycle
- Docker Engine on Debian: https://docs.docker.com/engine/install/debian/
- Docker Linux post-installation steps: https://docs.docker.com/engine/install/linux-postinstall/
- Docker daemon configuration: https://docs.docker.com/engine/daemon/
- Docker containerd image store: https://docs.docker.com/engine/storage/containerd/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Raspberry Pi getting started / Imager customization: https://www.raspberrypi.com/documentation/computers/getting-started.html
- Raspberry Pi remote access: https://www.raspberrypi.com/documentation/computers/remote-access.html
- Home Assistant Container installation: https://www.home-assistant.io/installation/alternative/
- Pi-hole Docker documentation: https://docs.pi-hole.net/docker/

## Issues Found
- The post hardcoded the `pi` username and `raspberrypi.local`, but current Raspberry Pi Imager setup uses the username and hostname chosen during imaging. Updated the SSH example and Docker group command to use the active user and hostname instead.
- The 64-bit OS requirement was justified as a Docker requirement. Updated the text to reflect the current Portainer CE architecture support model: ARM64 is supported, not 32-bit ARM.
- The Portainer deployment used `portainer/portainer-ce:latest`. Updated it to `portainer/portainer-ce:lts`, which matches Portainer's documented CE release stream for stable installs.
- The USB SSD migration section moved only `/var/lib/docker`. Replaced it with accurate guidance because current Docker releases may also store image data under `/var/lib/containerd`, so that migration method is incomplete.
- The example stack used the obsolete top-level Compose `version` field and hardcoded `/home/pi`. Removed the obsolete field and generalized the Home Assistant host path.

## Review Notes
- The Docker convenience script shown in the post is still an official install method, but Docker documents it as best suited to testing and development; the `apt` repository method is the supported path for longer-lived installs.
- Portainer's `8000` port is optional and is only required if Edge Agents are used.
- The Pi-hole and Home Assistant stack examples are minimal examples; real deployments may require additional environment variables, devices, or network settings depending on the features you use.
