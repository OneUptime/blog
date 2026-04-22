# Validation Summary: How to Set Up IPv6 Networks in Portainer - Set

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Portainer
- Docker Engine networking
- Docker CLI
- IPv6 networking
- Bridge, macvlan, ipvlan, overlay, host, and none Docker network drivers

## Sources Consulted
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Macvlan network driver - https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs: IPvlan network driver - https://docs.docker.com/engine/network/drivers/ipvlan/
- Docker Docs: Overlay network driver - https://docs.docker.com/engine/network/drivers/overlay/
- Docker Docs: docker network create CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: docker container run CLI reference - https://docs.docker.com/reference/cli/docker/container/run/
- Docker Docs: docker network connect CLI reference - https://docs.docker.com/reference/cli/docker/network/connect/
- Portainer Docs: Networks - https://docs.portainer.io/sts/user/docker/networks
- Portainer Docs: Add a new network - https://docs.portainer.io/user/docker/networks/add

## Issues Found
- The post claimed Portainer provides a visual interface for managing all Docker network types. Portainer documents support for specific network types, so the wording was changed to "supported Docker network types."
- The CLI network creation examples were IPv4-only even though the post is about IPv6 networks. The bridge and ipvlan examples now enable IPv6 with `--ipv6`, and bridge, macvlan, and ipvlan examples now include IPv6 subnets and gateways where applicable.
- The static IP example only assigned an IPv4 address. It now also uses Docker's `--ip6` flag to assign a static IPv6 address on the IPv6-enabled network.

## Review Notes
Docker IPv6 networking is supported on Docker daemons running on Linux hosts. The example IPv6 prefixes are Unique Local Address-style examples; production macvlan and ipvlan deployments must use prefixes, gateways, and parent interfaces that match the operator's actual network. Docker was not installed in the review workspace, so CLI syntax was validated against official Docker documentation rather than local `--help` output.
