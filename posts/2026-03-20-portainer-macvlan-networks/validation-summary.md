# Validation Summary: How to Configure Macvlan Networks for Direct LAN Access in Portainer (2)

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker Compose / stack syntax
- Linux macvlan networking (`ip link`, `ip addr`, `ip route`)
- Pi-hole Docker image
- AdGuard Home Docker image

## Sources Consulted
- Docker Docs: Macvlan network driver - https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs: `docker network create` CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Compose services reference (`ipv4_address`) - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose networks reference (`external`, `ipam`) - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose version and name (`version` obsolete) - https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs: Add a new network - https://docs.portainer.io/user/docker/networks/add
- Portainer Docs: Networks overview - https://docs.portainer.io/user/docker/networks
- Pi-hole Docs: Docker - https://docs.pi-hole.net/docker/
- AdGuard Home Wiki: Docker - https://github.com/AdguardTeam/AdGuardHome/wiki/Docker
- Local `iproute2` help: `ip link help type macvlan`, `ip addr help`, `ip route help`

## Issues Found
- The original `/29` example implied `.200` through `.207` were usable container addresses. I corrected this to reflect CIDR math: `192.168.1.200/29` has usable addresses `.201`-`.206` before exclusions, so the sample static container IPs were moved to `.201` and `.202`.
- The host-access workaround used `192.168.1.205` without reserving it from Docker's address pool. I reserved `192.168.1.206` with `--aux-address` / `aux_addresses` and updated the host-side macvlan interface to use that address to avoid collisions.
- The stack example assigned static `ipv4_address` values on an `external` network and included the obsolete top-level `version` key. I rewrote the example to define the macvlan network with Compose `ipam` so the static IP assignments match current Docker Compose documentation, and removed the obsolete `version` field.
- The Pi-hole example used older environment variables (`WEBPASSWORD`, `DNSMASQ_LISTENING`) that are no longer the current documented Docker configuration. I updated them to `FTLCONF_webserver_api_password` and `FTLCONF_dns_listeningMode`, and added `FTLCONF_misc_etc_dnsmasq_d` because the example persists `/etc/dnsmasq.d`.
- The Portainer instructions referred to a dedicated “Parent network card” field. Current Portainer docs describe this as a driver option, so I updated the wording to `parent=eth0` and added the documented excluded-IP concept used by the host-side workaround.
- The 802.1Q section implied you must manually create `eth0.100` first. Current Docker macvlan documentation says Docker creates the VLAN sub-interface automatically when the parent interface uses dot notation, so I corrected that explanation and example.
- The prerequisites were missing the Linux-only requirement and overstated interface-level promiscuous mode as sufficient on VMs. I clarified that macvlan requires a Linux host and that virtualized environments may also need the hypervisor vSwitch / port group to allow multiple MAC addresses or promiscuous mode.

## Review Notes
- Macvlan is Linux-only, unsupported in rootless Docker, and often blocked by cloud networking environments; the guide is most applicable to bare-metal or VM environments where multiple MAC addresses are permitted.
- The post still uses `latest` image tags for Pi-hole and AdGuard Home. That is valid, but readers who want fully repeatable deployments may prefer version-pinned tags.
