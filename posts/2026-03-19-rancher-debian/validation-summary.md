# Validation Summary: How to Install Rancher on Debian

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Debian 12 (Bookworm)
- Docker Engine
- Linux firewalling with iptables/ip6tables
- systemd

## Sources Consulted
- Rancher: Installing Rancher on a Single Node Using Docker - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/other-installation-methods/rancher-on-a-single-node-with-docker
- Rancher: Installation Requirements - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements
- Rancher: Port Requirements - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/installation-requirements/port-requirements
- Rancher: Setting up the Bootstrap Password - https://ranchermanager.docs.rancher.com/getting-started/installation-and-upgrade/resources/bootstrap-password
- Rancher: Advanced Options for Docker Installs - https://ranchermanager.docs.rancher.com/reference-guides/single-node-rancher-in-docker/advanced-options
- Docker Docs: Install Docker Engine on Debian - https://docs.docker.com/engine/install/debian/
- Docker Docs: Linux post-installation steps for Docker Engine - https://docs.docker.com/engine/install/linux-postinstall/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- Debian: Debian “bookworm” Release Information - https://www.debian.org/releases/bookworm/

## Issues Found
- The post stated that Debian 12 is the current stable release. I corrected this to reflect that Debian 13 is the current stable release as of 2026-05-07, while Debian 12 remains supported.
- The post presented Rancher's single-node Docker install as suitable for production. Rancher's official documentation marks Docker installs as testing/development only, so I updated the description, introduction, install step, and conclusion to reflect that.
- The prerequisites listed a generic 4 GB RAM / 2 CPU minimum. I replaced this with a requirement to size the host according to Rancher's current installation requirements and clarified the supported host architecture as 64-bit x86.
- The firewall section incorrectly suggested opening inbound TCP 6443 on the Rancher Docker host and recommended `ufw` for Docker-published ports. Rancher's port requirements only require inbound 80/443 for Rancher-in-Docker, and Docker documents that published ports bypass `ufw`, so I replaced that guidance with accurate Docker-aware firewall guidance.
- The Debian-specific firewall note incorrectly implied that switching to `iptables-legacy` was required. Docker's official docs state that both `iptables-nft` and `iptables-legacy` are supported, while native `nft` rules are not, so I corrected that explanation.
- The troubleshooting section checked general iptables rules rather than the `DOCKER-USER` chain that Docker documents for user-defined filtering. I updated the commands accordingly.
- The Docker daemon configuration step assumed `/etc/docker` already existed. I added `sudo mkdir -p /etc/docker` so the command works reliably on a fresh host.

## Review Notes
- Docker's current Debian installation docs use a deb822-style `docker.sources` file and `docker.asc`; the post's repository setup uses an older but still functional APT source format.
- The swap disable step is not explicitly required in Rancher's current single-node Docker documentation, but it is a conservative Linux host-preparation step and does not invalidate the guide.
