# Validation Summary: Installing Portainer CE on Debian with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Debian
- Docker Engine
- Portainer Community Edition (CE)
- UFW / Linux firewalling

## Sources Consulted
- Portainer Documentation: Install Portainer CE with Docker on Linux: https://docs.portainer.io/sts/start/install-ce/server/docker/linux
- Portainer Documentation: Updating on Docker Standalone: https://docs.portainer.io/sts/start/upgrade/docker
- Docker Docs: Install Docker Engine on Debian: https://docs.docker.com/engine/install/debian/
- Docker Docs: Linux post-installation steps for Docker Engine: https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Packet filtering and firewalls: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Local CLI help: `ufw --help`

## Issues Found
- The verification step used `docker --version`, which only confirms the CLI is installed. I changed it to `docker run hello-world` to match Docker's official post-install verification for daemon access and non-root usage.
- The deployment and update commands used `portainer/portainer-ce:latest`. I changed them to `portainer/portainer-ce:sts` to match the current official Portainer CE install and upgrade documentation.
- The UFW section implied that allowing ports in UFW was the correct way to manage access to Docker-published ports. I replaced that section with an accurate note because Docker documents that published container ports bypass UFW rules, and I clarified that port `8000` is only needed for Edge agents.
- The troubleshooting advice suggested `chmod 666 /var/run/docker.sock`, which is insecure and not the Docker-documented fix. I replaced it with adding the user to the `docker` group and reloading group membership.

## Review Notes
- Docker's Debian install docs still list Debian 11 and Debian 12 as supported on 2026-04-24, but Debian 11 is now `oldoldstable`.
- The `get.docker.com` convenience script remains available, but Docker documents it as recommended primarily for testing and development environments.
