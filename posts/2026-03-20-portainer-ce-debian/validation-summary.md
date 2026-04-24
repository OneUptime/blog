# Validation Summary: How to Install Portainer CE on Debian with Docker

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Debian 11 (Bullseye)
- Debian 12 (Bookworm)
- Docker Engine
- Docker Compose plugin
- Portainer CE
- Linux firewalling with `iptables` and `nftables`

## Sources Consulted
- Docker Docs, "Install Docker Engine on Debian": https://docs.docker.com/engine/install/debian/
- Docker Docs, "Linux post-installation steps for Docker Engine": https://docs.docker.com/engine/install/linux-postinstall
- Docker Docs, "Docker with iptables": https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs, "Docker with nftables": https://docs.docker.com/engine/network/firewall-nftables/
- Portainer Docs, "Install Portainer CE with Docker on Linux" (LTS): https://docs.portainer.io/2.33-lts/start/install-ce/server/docker/linux
- Portainer Docs, "Initial setup": https://docs.portainer.io/start/install-ce/server/setup
- Local `ss --help` output on the review machine for CLI syntax verification

## Issues Found
- The post used an older Docker APT repository setup (`docker.gpg` plus a `.list` entry). I updated it to Docker's current Debian instructions, which use `/etc/apt/keyrings/docker.asc` and a `docker.sources` file, and I aligned the conflicting-package removal command with Docker's current package list.
- The post used `portainer/portainer-ce:latest`, which is not the documented tag in Portainer's current CE install guides. I changed the install and update commands to use `portainer/portainer-ce:lts`, which matches Portainer's documented LTS install flow.
- The firewall section recommended appending `iptables` rules to the `INPUT` chain. Docker documents that filtering for published container ports should be handled before Docker's forwarding rules, using `DOCKER-USER` with the `iptables` backend, while the `nftables` backend uses separate user-managed tables. I replaced the incorrect commands with accurate guidance.
- The access step did not reflect current Portainer password requirements. I updated the wording so it no longer implies any password value will be accepted during initial setup.
- The troubleshooting section used `netstat`, which is commonly absent on default Debian installs unless `net-tools` is installed separately. I replaced it with `ss`, which is the standard socket inspection tool on modern Debian systems.
- The prerequisite list claimed a fixed minimum of 2 GB RAM and 20 GB disk. I removed that unsupported requirement because current Docker and Portainer install documentation for this flow does not define a universal minimum for this setup.

## Review Notes
- Portainer documents port `8000` as optional and only required for Edge agent use. The guide still maps it, which is valid, but readers who do not use Edge features could omit that port.
- Docker's post-installation documentation warns that membership in the `docker` group grants root-level privileges.
- Docker's current Debian installation documentation also supports Debian 13, but the post remains technically valid for the Debian 11 and Debian 12 scope it claims to cover.
- On a fresh Portainer install, initial setup should be completed promptly; Portainer documents that the instance stops listening if the first admin user is not created within the initial timeout window.
