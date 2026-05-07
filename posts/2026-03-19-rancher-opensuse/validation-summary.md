# Validation Summary: How to Install Rancher on openSUSE

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Rancher
- openSUSE Leap
- Docker Engine
- firewalld
- AppArmor
- zypper

## Sources Consulted
- Rancher docs: Installing Rancher on a Single Node Using Docker - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- Rancher docs: Installation Requirements - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher docs: Setting up the Bootstrap Password - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/bootstrap-password
- Rancher docs: Advanced Options for Docker Installs - https://ranchermanager.docs.rancher.com/v2.14/reference-guides/single-node-rancher-in-docker/advanced-options
- openSUSE Wiki: Docker - https://en.opensuse.org/Docker
- openSUSE Software: docker-compose package availability - https://software.opensuse.org/package/docker-compose?locale=en
- openSUSE Leap Security and Hardening Guide - https://doc.opensuse.org/documentation/leap/security/single-html/book-security/index.html
- Docker docs: AppArmor security profiles for Docker - https://docs.docker.com/engine/security/apparmor/
- Docker docs: Select a storage driver - https://docs.docker.com/engine/storage/drivers/select-storage-driver/
- openSUSE zypper man page - https://manpages.opensuse.org/Leap-15.6/zypper/zypper.8.en.html

## Issues Found
- The post presented Rancher-on-Docker as a general installation path. Rancher’s official docs explicitly limit the single-node Docker install to testing and development, so I updated the description, introduction, and conclusion to make the production caveat accurate.
- The original swap-disable step was not required for Rancher running in a single Docker container. I replaced it with a clarification that swap settings become relevant only if the same host is later used as a Kubernetes node.
- The Docker install step included `docker-compose`, but the guide never uses Compose and Rancher’s Docker install only requires Docker Engine. I changed the install command to `sudo zypper install -y docker`.
- The firewall section opened TCP 6443 and enabled masquerading, but Rancher’s documented single-node Docker install only publishes ports 80 and 443. I removed the extra firewall changes.
- The kernel module and sysctl section configured Kubernetes host prerequisites (`br_netfilter`, `overlay`, and bridge/ip_forward sysctls) that are not required for a single-container Rancher install. I replaced that section with an accurate note about when those settings are actually needed.
- The AppArmor step advised forcing Docker into complain mode with a distro-specific profile path. Docker’s own AppArmor guidance does not require this for normal operation, so I reduced the step to verification commands only.
- The Docker logging section also hard-set `storage-driver` to `overlay2`. I removed that forced storage-driver setting and updated the Btrfs note to verify the active storage configuration with `docker info` instead.

## Review Notes
- `rancher/rancher:latest` matches Rancher’s published Docker example, but pinning a specific Rancher tag would make the guide more reproducible over time.
- The post now reads correctly for openSUSE Leap. The MicroOS note is still ancillary and should be re-checked separately if the post is ever expanded into a MicroOS-specific guide.
