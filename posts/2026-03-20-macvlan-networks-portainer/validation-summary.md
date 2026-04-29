# Validation Summary: How to Configure Macvlan Networks for Direct LAN Access in Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine networking
- Docker Compose
- Docker Macvlan networks
- Portainer
- Pi-hole
- Home Assistant Container
- AppDaemon
- Linux `ip` networking commands

## Sources Consulted
- Docker Macvlan network driver documentation: https://docs.docker.com/engine/network/drivers/macvlan/
- Docker `network create` CLI reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker Compose networks reference: https://docs.docker.com/reference/compose-file/networks/
- Docker Compose version/name reference: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer network management documentation: https://docs.portainer.io/user/docker/networks/add
- Pi-hole Docker configuration documentation: https://docs.pi-hole.net/docker/configuration/
- Home Assistant Container installation documentation: https://www.home-assistant.io/installation/linux/
- AppDaemon Docker installation documentation: https://appdaemon.readthedocs.io/en/4.5.11/INSTALL.html

## Issues Found
1. **Prerequisites incorrectly treated promiscuous mode as a host NIC command to enable.** Docker's documentation says the requirement is that the underlying network equipment must support multiple MAC addresses on the parent interface; it does not require the specific `ip link set eth0 promisc on` and udev-rule workflow shown in the post. Replaced that section with an accurate interface-identification step and current platform limitations for Macvlan.
2. **The Macvlan IP pool conflicted with the host-side Macvlan interface added later.** The post assigned `192.168.1.241` to the host in Step 4 but did not reserve or exclude that address when creating the Docker network, which could let Docker allocate it to a container. Added `--aux-address="host=192.168.1.241"` to the Docker CLI example, added the matching excluded IP in the Portainer steps, and corrected the IP range explanation.
3. **The IP range explanation included a non-assignable address and overstated the usable container pool.** With `192.168.1.240/28`, `.240` is the network address and `.255` is the broadcast address. After reserving `.241` for the host-side Macvlan interface, the practical container pool is `.242` through `.254`. Updated the explanation to reflect that accurately.
4. **The Pi-hole environment variables were outdated.** The post used `WEBPASSWORD` and `PIHOLE_DNS_`, while current Pi-hole Docker documentation recommends `FTLCONF_webserver_api_password` and `FTLCONF_dns_upstreams`. Updated the Compose example to use the current variable names.
5. **The Compose examples used the obsolete top-level `version` key.** Current Docker Compose documentation marks `version` as obsolete and only retained for backward compatibility. Removed the `version: "3.8"` lines from both Compose snippets.
6. **The host-access persistence example omitted required privilege handling and was not safe to rerun.** Writing under `/etc` and creating routes/interfaces requires elevated privileges, and the original `networkd-dispatcher` example would fail on repeated execution. Added `sudo` where required and made the persistence snippet idempotent with `ip addr replace`, `ip route replace`, and a guard around the interface creation.

## Review Notes
- The core explanation of Macvlan is accurate: containers receive their own MAC address and appear as separate hosts on the LAN, and Docker officially documents that Macvlan-attached containers cannot communicate with the host directly unless you add another network or create a host-side Macvlan interface.
- The `docker network create` syntax, the use of `--ip-range`, the `parent` option, and the Portainer workflow for subnet/gateway/range/excluded IP settings all align with current Docker and Portainer documentation.
- The Home Assistant example uses a valid image and `privileged: true`, which matches the current Home Assistant Container guidance. Separately, Home Assistant's official installation docs commonly use `network_mode: host`; this post's Macvlan approach is still valid for the networking goal discussed here, but readers may still need extra device or D-Bus mappings depending on the integrations they use.
- The persistence example remains one Linux-specific approach. It assumes a host that uses `networkd-dispatcher`; other distributions or network managers may require a different persistence mechanism.
