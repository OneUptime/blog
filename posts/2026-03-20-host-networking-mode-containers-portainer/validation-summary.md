# Validation Summary: How to Configure Host Networking Mode for Containers in Portainer - Mode

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Docker Engine
- Docker Compose / Compose file format
- Host networking
- Macvlan networking
- Linux container security controls

## Sources Consulted
- Docker Docs: Host network driver - https://docs.docker.com/engine/network/drivers/host/
- Docker Docs: Compose services reference (`network_mode`, `ports`) - https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Compose networks reference (`ipam`, `ip_range`) - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Networking overview - https://docs.docker.com/engine/network/
- Docker Docs: Macvlan network driver - https://docs.docker.com/engine/network/drivers/macvlan/
- Portainer Docs: Add a new stack - https://docs.portainer.io/user/docker/stacks/add

## Issues Found
- The post said a `ports` section is "ignored" with `network_mode: host` in a Compose file. Current Docker Compose documentation states this causes a runtime error, so I changed the example to show that `ports` must be removed instead.
- The performance section included fixed throughput numbers and a percentage gain that are environment-specific and not generally valid. I replaced those comments with wording that instructs readers to benchmark on their own host.
- The DPDK example comments stated that `NET_ADMIN` and `SYS_RAWIO` were required. Those requirements depend on the specific DPDK driver and device configuration, so I changed the comments to avoid overstating them.
- The limitation about DNS was too broad. I narrowed it to Docker service-name DNS on a Compose network, which is the relevant behavior affected by `network_mode: host`.
- The summary said host networking "eliminates Docker's network namespace". I corrected this to say the container uses the host's network namespace.

## Review Notes
- Host networking is supported on Docker Engine on Linux and on Docker Desktop 4.34+ when the feature is enabled.
- Portainer stack files use Compose-format definitions, so Docker Compose networking rules apply to these examples.
- Docker documents operational caveats for `macvlan`, including that host-to-container communication is not direct without additional host-side configuration.
