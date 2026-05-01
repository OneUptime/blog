# Validation Summary: How to Configure Docker Macvlan Networks with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine networking
- Docker macvlan network driver
- IPv6 container networking
- Docker Compose networking
- Linux `ip link` / macvlan interfaces

## Sources Consulted
- Docker Docs: Macvlan network driver - https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: `docker container run` CLI reference - https://docs.docker.com/reference/cli/docker/container/run
- Docker Docs: `docker network create` CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Compose networks reference - https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Compose services reference - https://docs.docker.com/reference/compose-file/services/
- Linux `ip-link(8)` manual page - https://man7.org/linux/man-pages/man8/ip-link.8.html

## Issues Found
- The post used invalid IPv6 literals such as `2001:db8:lan::/64` and `2001:db8:vlan100::/64`. IPv6 hextets must be hexadecimal, so I replaced them with valid documentation-prefix examples such as `2001:db8:1::/64` and `2001:db8:100::/64`.
- The prerequisites and introduction omitted two real requirements from Docker’s current macvlan/IPv6 docs: macvlan is for Linux hosts, and dual-stack macvlan requires IPv6 enabled in the Docker daemon. I added those requirements and clarified the network-equipment constraint around multiple MAC addresses.
- The `nginx:latest` example used `docker exec ... ip` and `docker exec ... curl`, but that image does not reliably provide the tools used in the validation steps. I changed the runnable example to `alpine:latest tail -f /dev/null`, which matches the `ip`/`ping` checks used afterward.
- The outbound connectivity check used `curl -6 https://ipv6.google.com/`, which depended on a tool not present in the example container. I replaced it with `ping -6` to a public IPv6 address so the command aligns with the image actually being run.
- The VLAN section stated that you must create the VLAN sub-interface first. Docker’s macvlan docs say that when the parent includes a dot, such as `eth0.100`, Docker interprets it as a VLAN sub-interface and creates it automatically when needed. I corrected that explanation and removed the unnecessary manual `ip link add` step from the example.
- The VLAN container command used `alpine sleep infinity`, which is not a safe assumption for BusyBox `sleep`. I changed it to `alpine:latest tail -f /dev/null`, which is a standard keepalive pattern for Alpine-based examples.
- The host-isolation workaround assigned `2001:db8:lan::1` to the host-side macvlan interface even though that same address was used as the network gateway. I corrected this to use a distinct unused host address and added a specific IPv6 route for the container address through the host macvlan interface.

## Review Notes
- `macvlan` is Linux-only and is not supported on Docker Desktop for Mac or Windows.
- Docker documents that many cloud providers block `macvlan`, so the tutorial is most applicable to bare metal or environments with direct control of the L2 network.
- Docker was not installed in this review environment, so command validation was done against current Docker documentation and CLI reference rather than by executing the examples locally.
