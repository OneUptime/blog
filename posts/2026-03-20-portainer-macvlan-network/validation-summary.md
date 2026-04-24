# Validation Summary: How to Create a Macvlan Network in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker Compose
- Linux `iproute2`
- Macvlan networking
- 802.1Q VLANs

## Sources Consulted
- Docker Docs: Macvlan network driver: https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs: `docker network create`: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: `docker container run`: https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: `docker inspect`: https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Docs: Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: Compose services reference (`ipv4_address`): https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose networks reference (`external`, `ipam`): https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Networking in Compose: https://docs.docker.com/compose/how-tos/networking/
- Portainer Docs: Add a new network: https://docs.portainer.io/user/docker/networks/add
- Portainer Docs: Networks overview: https://docs.portainer.io/user/docker/networks?fallback=true
- Local `iproute2` help output used to verify Linux command syntax: `ip link help`, `ip link help macvlan`, `ip address help`, `ip route help`

## Issues Found
- The original Step 1 incorrectly treated host-side `ip link set eth0 promisc on` as a blanket Macvlan requirement. Docker’s documentation says the upstream network equipment or hypervisor must support multiple MAC addresses on the parent interface; it is not generally necessary to force the Linux parent interface into promiscuous mode. I replaced that section with an interface check and corrected explanation.
- The prerequisites omitted key platform limits from Docker’s Macvlan documentation. I added that Macvlan is Linux-only and is not supported on Docker Desktop for Mac or Windows, or in rootless mode.
- The Portainer and CLI network-creation examples did not reserve an address for the host-side Macvlan shim used later in the post. I added an excluded IP in the Portainer example and `--aux-address="host=192.168.1.200"` in the CLI example so the host workaround does not collide with Docker IP allocation.
- The host-to-container workaround assigned `192.168.1.200/24` to the host Macvlan interface, which can create an overlapping connected route on the host. I changed it to `192.168.1.200/32` and kept the explicit route for the container range.
- The Compose example used the obsolete top-level `version` field and combined static `ipv4_address` assignments with an `external` network definition. I replaced it with a Compose-spec-valid Macvlan network definition that includes `driver_opts` and `ipam` so the fixed addresses are backed by a declared subnet.
- The VLAN section implied you must manually create the VLAN sub-interface first. Docker’s Macvlan driver documentation says Docker creates the sub-interface automatically when the `parent` value contains a dot such as `eth0.100`. I kept the manual example but clarified that it is optional.
- The static-IP verification command used `docker exec ... ip addr show eth0`, which depends on `iproute2` being installed inside the container image. I replaced it with the Docker-documented `docker inspect --format='{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}'` pattern.
- The troubleshooting section used a stale promiscuous-mode check and a non-Docker `arp-scan` example. I replaced those with checks that align with Docker’s documented inspection commands and the corrected Macvlan requirements.
- The bridge-vs-Macvlan comparison and conclusion repeated the too-strong “host interface must be in promiscuous mode” claim. I corrected that wording to focus on the upstream network or hypervisor requirement.

## Review Notes
- The post is technically relevant and suitable for publication after correction.
- Docker’s current guidance still recommends preferring bridge or overlay networking when those models satisfy the application, because Macvlan carries extra operational tradeoffs such as MAC-address scale and environment restrictions.
- Macvlan remains environment-sensitive on virtualized hosts and is commonly blocked by cloud providers, so readers should validate switch, hypervisor, and DHCP behavior in their own environment.
