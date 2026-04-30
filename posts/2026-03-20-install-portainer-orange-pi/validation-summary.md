# Validation Summary: How to Install Portainer on Orange Pi

## Status
validated

## Post Type
Guide

## Technologies Covered
- Orange Pi
- Docker Engine
- Portainer CE
- Linux
- ARM64
- ARMv7

## Sources Consulted
- Docker Engine installation on Debian: https://docs.docker.com/engine/install/debian/
- Docker Engine installation on Ubuntu: https://docs.docker.com/installation/ubuntulinux/
- Docker Linux post-installation steps: https://docs.docker.com/engine/install/linux-postinstall
- Portainer CE install with Docker on Linux: https://docs.portainer.io/start/install-ce/server/docker/linux
- Portainer update on Docker Standalone: https://docs.portainer.io/start/upgrade/docker
- Portainer ARM architecture FAQ: https://docs.portainer.io/faqs/installing/which-arm-architectures-does-portainer-support
- Portainer requirements and prerequisites: https://docs.portainer.io/start/requirements-and-prerequisites
- Portainer CE image tags on Docker Hub: https://hub.docker.com/r/portainer/portainer-ce/tags/
- `ss --help` output on the review host

## Issues Found
- The post used `portainer/portainer-ce:latest` for installation and updates. I changed this to `portainer/portainer-ce:lts` to align the guide with Portainer's maintained LTS stream for a general self-hosted installation guide.
- The socket-permission troubleshooting step suggested `sudo chmod 666 /var/run/docker.sock`. I replaced this with the documented Docker group approach because making the Docker socket world-writable is insecure and not the recommended fix.
- The port-check example used `netstat`, which is not installed by default on many Debian and Ubuntu systems. I replaced it with `ss`, which is the current standard tool and was verified via `ss --help`.
- The Docker boot section implied an extra enable step was required. I clarified that Docker starts on boot automatically on Debian and Ubuntu, while keeping the enable command as an optional explicit step.

## Review Notes
- Docker's `get.docker.com` convenience script is officially documented, but Docker recommends it for testing and development rather than production installs. The post remains technically valid, but the `apt` repository method is the better long-term approach.
- Portainer's documentation currently distinguishes between STS and LTS release streams. Using the `lts` tag is the safer default for a durable tutorial.
- Portainer's current FAQ still notes ARMv7 availability, while the main requirements page emphasizes ARM64 and x86_64 for current CE releases. For modern Orange Pi boards, ARM64 remains the safer assumption.
