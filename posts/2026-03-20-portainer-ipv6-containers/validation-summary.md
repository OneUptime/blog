# Validation Summary: How to Set Up IPv6 for Containers in Portainer - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker bridge networks
- Docker macvlan networks
- Docker Compose network configuration
- Nginx
- IPv6

## Sources Consulted
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Macvlan network driver - https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs: Compose file reference, networks - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose version top-level element (obsolete) - https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: docker network create - https://docs.docker.com/reference/cli/docker/network/create/
- Portainer Documentation: Add a new network - https://docs.portainer.io/user/docker/networks/add
- NGINX documentation: `listen` directive - https://nginx.org/r/listen

## Issues Found
- The opening explanation incorrectly implied that Docker daemon IPv6 settings are required for all IPv6 container networking. I corrected this to match Docker's current docs: `ipv6` and `fixed-cidr-v6` are for the default `bridge` network, while user-defined networks can enable IPv6 directly.
- The Portainer UI instructions referenced an IPv6 enable toggle that is not documented on Portainer's network creation page. I changed the wording to refer to the documented **IPv6 Network configuration** fields instead.
- The examples used `fd00:100::/80`. I standardized them to `fd00:100::/64` to align with Docker's current IPv6 examples and documented `/64` subnet usage.
- The Compose example included a top-level `version: "3.8"` field, which Docker now documents as obsolete. I removed it.
- The stack example claimed `LISTEN_ADDR: "0.0.0.0"` binds "including IPv6", which is not generally true and was also application-specific. I removed that block.
- The verification commands used `ping6` without a count and assumed a specific container IPv6 address (`fd00:100::2`). I changed them to finite `ping -6 -c 4` commands and used the service name `api` instead of assuming a fixed address.
- The macvlan example omitted an IPv6 gateway. I added a gateway value so the example matches Docker's documented macvlan network configuration pattern.
- The troubleshooting table incorrectly tied gateway reachability to `ip6tables`, and incorrectly recommended a manual `ip6tables` NAT66 masquerade rule for external IPv6 access. I replaced those rows with guidance based on Docker's current published-port and direct-routing behavior.

## Review Notes
- The examples assume a Linux Docker host. Docker's IPv6 documentation explicitly limits IPv6 container networking support to Linux daemons.
- The stack example is for a user-defined bridge network on a single Docker host. If the environment is Docker Swarm, the networking model differs and the same bridge-network example does not apply as written.
