# Validation Summary: How to Create an IPvlan Network in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker Compose
- IPvlan
- Macvlan
- Linux IP forwarding and static routing
- AWS EC2 networking

## Sources Consulted
- Docker Docs: IPvlan network driver - https://docs.docker.com/engine/network/drivers/ipvlan/
- Docker Docs: Macvlan network driver - https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs: `docker network create` CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Compose services reference (`ipv4_address`) - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose networks reference (`external`, `ipam`) - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Version and name top-level elements (`version` is obsolete) - https://docs.docker.com/reference/compose-file/version-and-name/
- Portainer Docs: Networks - https://docs.portainer.io/user/docker/networks?fallback=true
- Portainer Docs: Add a new network - https://docs.portainer.io/user/docker/networks/add
- AWS EC2 User Guide: Modify network interface attributes - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/modify-network-interface-attributes.html
- AWS CLI reference: `modify-network-interface-attribute` - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-network-interface-attribute.html

## Issues Found
- The comparison table omitted officially supported driver modes and implied built-in DHCP support. I changed the mode lists to match Docker Docs and corrected DHCP guidance to say it is not built into Docker's standard macvlan/ipvlan flow. This DHCP correction is an inference from Docker's documented IPAM-based network model and the absence of built-in DHCP support in the official driver documentation.
- The Portainer and CLI examples used `192.168.1.200/26` as the IP range. I changed this to the canonical CIDR `192.168.1.192/26` so the documented range matches the actual `/26` network boundary.
- The Compose example used the obsolete top-level `version` key. I removed it to match current Compose guidance.
- The Compose example also combined an external pre-created network with inline static `ipv4_address` assignments without a corresponding top-level `ipam` declaration. I changed the example to attach services to the existing external network without inline static IPs so it aligns with the current Compose documentation.
- The L3 routing example used `route add ...` as though it were a universal router command. I replaced it with a router-agnostic static-route description.
- The verification section suggested a generic `ping` test without noting ipvlan host-namespace isolation. I clarified that the ping should be run from another machine on the same physical network, not from the Docker host itself.
- The troubleshooting section cited a specific Docker version floor that I could not verify from current official docs. I replaced it with a generic requirement that the Docker Engine support the `ipvlan` driver and that the host run Linux kernel 4.2+.
- The cloud decision tree overstated provider-specific behavior. I rewrote it around the documented constraint that ipvlan is preferable where additional MAC addresses are restricted.

## Review Notes
- Portainer's public docs explicitly describe ipvlan L2 and L3 modes. Docker Engine docs also list `l3s` as a supported `ipvlan_mode`, but this guide remains focused on the common L2/L3 workflows.
- The guide assumes a Linux Docker Engine host and a network where you can add static routes for L3 mode.
- Docker was not installed in this review workspace, so validation was documentation-based rather than a live command execution test.
