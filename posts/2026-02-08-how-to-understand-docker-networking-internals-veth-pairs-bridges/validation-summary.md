# Validation Summary: How to Understand Docker Networking Internals (veth pairs, bridges)

## Status
validated

## Post Type
Tutorial / hands-on technical guide

## Technologies Covered
- Docker Engine networking
- Linux bridge networking
- veth pairs
- Linux network namespaces
- iptables / Docker firewall rules
- tcpdump packet capture
- Docker bridge, host, macvlan, and ipvlan network drivers
- Docker embedded DNS

## Sources Consulted
- Docker Docs: Bridge network driver: https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Networking overview and DNS services: https://docs.docker.com/engine/network/
- Docker Docs: Docker with iptables: https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: Packet filtering and firewalls: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Host network driver: https://docs.docker.com/engine/network/drivers/host/
- Docker Docs: Macvlan network driver: https://docs.docker.com/engine/network/drivers/macvlan/
- Linux man-pages: veth(4): https://man7.org/linux/man-pages/man4/veth.4.html
- Linux man-pages: network_namespaces(7): https://man7.org/linux/man-pages/man7/network_namespaces.7.html
- Linux man-pages: ip-netns(8): https://man7.org/linux/man-pages/man8/ip-netns.8.html
- Local CLI help/version checks for Docker 29.4.2, iproute2 6.1.0, util-linux nsenter 2.39.3, iptables 1.8.10, and tcpdump 4.99.4.

## Issues Found
- The post said Docker creates `docker0` when Docker installs. Docker's documentation describes the default bridge network as being created when Docker starts. Updated the sentence to say Docker Engine starts on Linux and creates a default bridge network backed by `docker0`.
- The veth inspection example used `bridge link show docker0`. While accepted by the local iproute2 version, the documented command form is `bridge link show dev DEV`. Updated the example to `bridge link show dev docker0`.
- The diagram implied that `docker0` is directly connected to the host `eth0`. Docker bridge egress uses host routing/NAT rather than a direct bridge port to the physical interface. Updated the diagram label to `host routing/NAT via eth0`.
- The iptables chain list used older `DOCKER-ISOLATION-STAGE-1/2` terminology. Current Docker documentation lists `DOCKER-USER`, `DOCKER-FORWARD`, `DOCKER`, `DOCKER-BRIDGE`, `DOCKER-INTERNAL`, `DOCKER-CT`, and `DOCKER-INGRESS` in the filter table, plus `DOCKER` in the nat table. Updated the chain list and troubleshooting command accordingly.
- The troubleshooting command used `nslookup` inside the `net-demo` nginx container even though the earlier install step only added `iputils-ping`; `nslookup` is not guaranteed to be present. Replaced it with `getent hosts google.com`, which fits the Debian-based nginx image used in the tutorial.

## Review Notes
- The post is Linux-focused. Some details, especially `docker0`, host networking behavior, and macvlan support, differ on Docker Desktop or non-Linux hosts.
- Docker can use either iptables or nftables firewall backends depending on daemon configuration and version. The post remains valid for the documented default iptables-oriented workflow.
