# Validation Summary: How to Understand Docker Bridge Network Internals

## Status
validated

## Post Type
Tutorial / Technical guide

## Technologies Covered
- Docker Engine bridge networking
- Linux bridge interfaces
- Virtual Ethernet pairs (veth)
- Docker network IPAM
- Docker port publishing, NAT, iptables, and userland proxy
- Docker embedded DNS
- Inter-container communication (ICC)
- MTU configuration
- Host, macvlan, and ipvlan network drivers

## Sources Consulted
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Networking overview - https://docs.docker.com/network/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: docker network create CLI reference - https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: dockerd CLI reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Legacy container links - https://docs.docker.com/engine/network/links/
- Linux kernel documentation: Ethernet Bridging - https://www.kernel.org/doc/html/v6.12/networking/bridge.html
- Linux man-pages: bridge(8) - https://man7.org/linux/man-pages/man8/bridge.8.html
- Linux man-pages: veth(4) - https://man7.org/linux/man-pages/man4/veth.4.html
- Local CLI help: `docker network create --help`, `docker network inspect --help`, `docker run --help`, `ip link help`, `ip addr help`, `bridge fdb help`

## Issues Found
- The introduction implied every container connects to a network and that the default is always `docker0`. Updated the wording to say containers use a network mode and that `docker0` is the default unless modes such as `host` or `none` are selected.
- The Linux bridge section said Docker creates `docker0` at installation time. Updated this to say Docker creates it when the daemon starts, matching Docker's description of the default bridge network being created when Docker Engine starts.
- The port publishing section said Docker always starts a `docker-proxy` process and described it as handling hairpin NAT. Updated this to note that `docker-proxy` is started when the daemon's userland proxy is enabled, and clarified that Docker relies on kernel NAT behavior such as hairpin NAT when the proxy is disabled.

## Review Notes
- The post remains Linux-focused, which is appropriate for `docker0`, veth, bridge FDB, and iptables examples. Docker Desktop uses a VM/backend networking path, so these host-level Linux commands may not map directly to macOS or Windows hosts.
- `brctl` is still usable through `bridge-utils`, but it is an older interface; modern Linux systems often prefer the `ip` and `bridge` commands from iproute2.
