# Validation Summary: How to Install Rancher on Ubuntu 22.04

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Docker Engine
- Ubuntu 22.04 LTS
- UFW
- Kubernetes

## Sources Consulted
- Rancher: Installing Rancher on a Single Node Using Docker - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- Rancher: Installation Requirements - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher: Port Requirements - https://ranchermanager.docs.rancher.com/v2.13/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- Rancher: Setting up the Bootstrap Password - https://ranchermanager.docs.rancher.com/v2.14/getting-started/installation-and-upgrade/resources/bootstrap-password
- Rancher: Advanced Options for Docker Installs - https://ranchermanager.docs.rancher.com/v2.14/reference-guides/single-node-rancher-in-docker/advanced-options
- Rancher: Authentication, Permissions and Global Settings - https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration
- Docker Docs: Install Docker Engine on Ubuntu - https://docs.docker.com/engine/install/ubuntu/
- Docker Docs: Linux post-installation steps - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Configure logging drivers - https://docs.docker.com/engine/logging/configure/
- Docker Docs: JSON File logging driver - https://docs.docker.com/engine/logging/drivers/json-file/
- Docker Docs: docker container run - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Ubuntu: release cycle for Ubuntu 22.04 LTS - https://ubuntu.com/about/release-cycle?product=ubuntu&release=ubuntu&version=22.04+LTS
- Kubernetes: Linux Node Swap Behaviors - https://kubernetes.io/docs/reference/node/swap-behavior/

## Issues Found
- The post treated Rancher-in-Docker as a general installation path. I updated the introduction and conclusion to reflect Rancher's current guidance that single-node Docker installs are for testing and development, not production.
- The prerequisite sizing was too low. I changed it from 4 GB RAM and 2 CPU cores to 16 GB RAM and 4 vCPUs to match Rancher's current small-deployment baseline in the installation requirements.
- The Docker installation steps used an older repository/keyring pattern. I updated them to Docker's current Ubuntu installation procedure using `/etc/apt/keyrings/docker.asc` and a `docker.sources` file.
- The firewall step incorrectly opened inbound port 6443 on the Rancher server. I removed that rule and clarified that Docker-based Rancher server access is on ports 80 and 443, while Docker publishes container ports using its own firewall rules.
- The Rancher `docker run` example did not enable log rotation, while the later daemon-level log rotation step would not retroactively affect an existing container. I added `--log-driver json-file` with `--log-opt max-size=10m` and `--log-opt max-file=3` to the Rancher container, and corrected Step 10 to explain that daemon defaults only apply to newly created containers.
- The initial UI setup instructions were partially inaccurate. I updated them to reflect Rancher's documented first-login flow: set a new admin password of at least 12 characters and configure the Rancher Server URL. I removed the unsupported "accept the terms and conditions" step.
- The troubleshooting section included unsupported or outdated guidance. I removed the AppArmor `aa-remove-unknown` recommendation and the blanket swap guidance because they were not supported by current Rancher docs, and Kubernetes now documents more nuanced swap behavior.
- The Ubuntu lifecycle statement was slightly wrong. I corrected the standard security maintenance date for Ubuntu 22.04 from April 2027 to May 2027.

## Review Notes
- The post now aligns with current Rancher and Docker documentation for a single-node Docker deployment, but this installation method remains appropriate only for testing and development.
- The guide installs the latest Docker Engine packages from Docker's repository. For strict supportability on a chosen Rancher release, readers should still verify the Docker version against the Rancher support matrix.
