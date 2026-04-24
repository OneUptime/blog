# Validation Summary: How to Configure IPvlan L2 Mode for Containers in Portainer - Networking

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker Compose / stack syntax
- IPvlan L2 networking
- Macvlan networking
- Linux `iproute2`
- Pi-hole
- Home Assistant

## Sources Consulted
- Docker Docs, IPvlan network driver: https://docs.docker.com/engine/network/drivers/ipvlan/
- Docker Docs, Macvlan network driver: https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs, `docker network create`: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs, Define and manage networks in Docker Compose: https://docs.docker.com/reference/compose-file/networks/
- Docker Docs, Version and name top-level elements: https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Documentation, Networks: https://docs.portainer.io/user/docker/networks?fallback=true
- Portainer Documentation, Add a new network: https://docs.portainer.io/user/docker/networks/add
- Pi-hole documentation, Docker configuration: https://docs.pi-hole.net/docker/configuration/
- Home Assistant documentation, Home Assistant Container: https://www.home-assistant.io/installation/alternative
- Linux Kernel documentation, IPVLAN Driver HOWTO: https://docs.kernel.org/networking/ipvlan.html

## Issues Found
- The `docker network create` example used `--ip-range 192.168.1.210/29`, which is not a network-aligned CIDR for the reserved address pool. I changed it to `192.168.1.208/29` and updated the matching host route to `192.168.1.208/29` so the IPAM range and route target the same valid `/29` block.
- The Portainer UI instructions implied a separate `Parent` field. I changed this to `Driver options: ipvlan_mode=l2, parent=eth0` to match Portainer's documented network form and Docker's `parent` driver option.
- The Pi-hole Compose example used `WEBPASSWORD`. I changed it to `FTLCONF_webserver_api_password`, which is the current variable documented by Pi-hole for setting the web interface password in Docker.
- The VLAN section said to create the VLAN sub-interface first. I changed that wording to say you can create it first, because Docker's IPvlan docs state dotted VLAN sub-interfaces can be created automatically when used as the parent.
- The comparison table oversimplified Macvlan's requirements and use cases. I updated those cells to better match Docker's official Macvlan and IPvlan guidance.

## Review Notes
- The post is now technically correct for Linux Docker Engine environments. Docker's IPvlan driver requires a Linux host and Docker documents Linux kernel `4.2+` as the supported baseline.
- The top-level Compose `version: "3.8"` field remains valid for backward compatibility, but Docker now treats `version` as obsolete/informational under the Compose Specification.
- The local workspace did not have the `docker` CLI installed, so command verification relied on Docker's official CLI and driver documentation plus local `ip` command help for route syntax.
