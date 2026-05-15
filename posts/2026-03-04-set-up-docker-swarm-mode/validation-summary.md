# Validation Summary: How to Set Up Docker Swarm Mode on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux
- Docker Engine
- Docker Swarm mode
- systemd
- firewalld

## Sources Consulted
- Docker Docs: Install Docker Engine on RHEL - https://docs.docker.com/engine/install/rhel/
- Docker Docs: Getting started with Swarm mode - https://docs.docker.com/engine/swarm/swarm-tutorial/
- Docker Docs: docker swarm init CLI reference - https://docs.docker.com/reference/cli/docker/swarm/init/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- firewalld manual page for firewall-cmd - https://firewalld.org/documentation/man-pages/firewall-cmd.html

## Issues Found
- The prerequisites did not specify maintained RHEL versions or the need for a stable manager IP address. Updated them to match Docker's RHEL support and Swarm networking requirements.
- The dependency installation used `epel-release` and `"Development Tools"`, which are not the documented prerequisites for Docker Engine installation on RHEL. Replaced them with `dnf-plugins-core` and the official Docker RHEL repository setup command.
- The package installation used `<package-name>` placeholders instead of Docker Engine packages. Replaced them with `docker-ce`, `docker-ce-cli`, `containerd.io`, `docker-buildx-plugin`, and `docker-compose-plugin`.
- The verification commands checked a placeholder package. Replaced them with `docker --version` and `rpm -qi docker-ce`.
- The service configuration step used a placeholder config file path. Replaced it with `docker swarm init --advertise-addr <manager-ip-address>` and `docker swarm join-token worker`.
- The Docker service was previously shown after the Swarm initialization step. Reordered the existing steps so Docker starts before Swarm mode is initialized.
- The service management, log, test, and monitoring commands used `<service>` placeholders. Replaced them with Docker-specific commands such as `systemctl status docker`, `docker info`, `docker node ls`, `journalctl -u docker`, and `top -p $(pidof dockerd)`.
- The firewall command used `--add-service=<service>`, but Docker Swarm requires specific ports between trusted nodes. Replaced it with documented Swarm ports: `2377/tcp`, `7946/tcp`, `7946/udp`, and `4789/udp`.
- The security considerations described a generic service model. Updated them to reflect Docker Swarm manager protection, join-token handling, mutual TLS, and trusted-node firewall restrictions.
- The troubleshooting section referenced a placeholder systemd unit. Replaced it with the Docker service unit.

## Review Notes
The post is now technically accurate for the current Docker Engine documentation on maintained RHEL releases. Future improvements could include adding worker-node join examples and a sample service deployment, but those were not added because the review was limited to correcting technical inaccuracies.
