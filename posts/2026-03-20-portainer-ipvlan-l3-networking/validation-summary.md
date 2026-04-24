# Validation Summary: How to Configure IPvlan L3 Mode for Container Routing in Portainer - Networking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine IPvlan networking
- Docker CLI networking commands
- Docker Compose / Portainer stack networking
- Linux IP routing and IP forwarding

## Sources Consulted
- Docker Docs: IPvlan network driver — https://docs.docker.com/engine/network/drivers/ipvlan/
- Docker Docs: docker network create — https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs: Define and manage networks in Docker Compose — https://docs.docker.com/reference/compose-file/networks/
- Docker Docs: Define services in Docker Compose — https://docs.docker.com/reference/compose-file/services/
- Docker Docs: Packet filtering and firewalls — https://docs.docker.com/engine/network/packet-filtering-firewalls/

## Issues Found

1. **The host-route instruction was misleading.** The post told readers to add `ip route add 172.16.100.0/24 dev eth0` on the Docker host. Docker's IPvlan L3 documentation states that L3 mode requires a route in the default namespace pointing to the parent interface, and the post already verifies that route later. I changed this to tell readers to verify the host route instead of adding a duplicate route that can fail with `RTNETLINK answers: File exists`.

2. **The multiple-subnet isolation claim was incorrect.** Docker's IPvlan docs explicitly state that, unlike IPvlan L2, different subnets/networks can ping one another as long as they share the same `-o parent=` interface in L3 mode. I updated the section to explain that same-parent L3 subnets are routable by default and that tenant isolation requires separate parents/VLANs or host firewall policy.

3. **The expected `ip route` output inside the container was inaccurate.** The post showed `default via 0.0.0.0 dev eth0`, but Docker's official IPvlan L3 example shows `default dev eth0`. I corrected the sample output accordingly.

4. **The external-access section needed a forwarding caveat.** Docker's firewall documentation notes that no firewall rules are created for `ipvlan`, and that Docker may set the host `FORWARD` policy to `DROP` when enabling IP forwarding with the iptables backend. I added a short note so the instructions do not imply that enabling `net.ipv4.ip_forward` is always sufficient by itself.

## Review Notes
- The article's core explanation of IPvlan L3 mode is accurate: no gateway is required for the network create command, broadcast and multicast traffic are dropped, and upstream routing is required for remote reachability.
- The Compose/stack example is valid for attaching services to a pre-created external network. Static `ipv4_address` values remain appropriate as long as the external network's IPAM configuration covers those addresses.
