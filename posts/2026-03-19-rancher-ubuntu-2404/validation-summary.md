# Validation Summary: How to Install Rancher on Ubuntu 24.04

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Docker Engine
- Ubuntu 24.04 LTS
- UFW
- Linux kernel modules and sysctl networking

## Sources Consulted
- Rancher: Installing Rancher on a Single Node Using Docker - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- Rancher: Installation Requirements - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher: Port Requirements - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- Rancher: Setting up the Bootstrap Password - https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/bootstrap-password
- Rancher: Authentication, Permissions and Global Settings - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Select a storage driver - https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- Docker Docs: Troubleshooting the Docker daemon - https://docs.docker.com/engine/daemon/troubleshoot/
- Ubuntu Server documentation: Firewall - https://ubuntu.com/server/docs/how-to/security/firewalls/
- Canonical Kubernetes documentation: How to configure Uncomplicated Firewall (UFW) - https://documentation.ubuntu.com/canonical-kubernetes/latest/snap/howto/networking/ufw/
- Ubuntu Security: Ubuntu Expanded Security Maintenance - https://ubuntu.com/security/esm

## Issues Found
- The post presented a single-node Docker installation without Rancher's official limitation that this method is for testing and development only. I updated the description, introduction, and conclusion to reflect that it is not supported for production.
- The Docker repository setup used an older pattern and omitted creating `/etc/apt/keyrings`, which can fail on a fresh Ubuntu 24.04 host. I replaced it with Docker's current Ubuntu installation steps.
- The firewall section opened inbound TCP `6443`, but Rancher's Docker install port requirements document only inbound `80` and `443` for the Rancher host. I removed `6443/tcp`.
- The firewall section enabled UFW without first allowing SSH access. I added `sudo ufw allow OpenSSH` before `sudo ufw enable` to avoid locking out remote administration.
- The firewall guidance implied UFW fully controls access to Docker-published ports. I added a note that Docker publishes container ports using its own firewall rules, which matters on Ubuntu hosts using UFW.
- The Docker logging snippet forced `"storage-driver": "overlay2"`, which is no longer the default storage backend behavior on fresh Docker Engine 29.x installs and was unrelated to log rotation. I removed that setting.
- The first-login instructions included an unsupported "Accept the terms and conditions" step. I removed it so the documented setup flow matches Rancher's current first-login guidance.
- The bootstrap-password step said Rancher would be ready in approximately one minute. I changed that to "a few minutes" because startup commonly takes longer on fresh hosts.

## Review Notes
- The post now aligns with current official guidance for a Docker-based Rancher lab install, but Rancher still recommends Kubernetes-based high-availability installs for production.
- The `rancher/rancher:latest` image tag matches Rancher's Docker install examples, but pinning an explicit Rancher version would improve reproducibility in a future revision.
- The stated `4 GB RAM` and `2 CPU cores` remain a light testing baseline. Rancher's current production sizing guidance for upstream clusters is substantially higher.
