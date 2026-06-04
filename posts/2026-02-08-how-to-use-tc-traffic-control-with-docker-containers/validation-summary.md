# Validation Summary: How to Use tc (Traffic Control) with Docker Containers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux tc / iproute2
- tc netem qdisc
- tc tbf qdisc
- Docker Engine networking
- Docker bridge networks and veth pairs
- Docker Compose
- Linux capabilities / NET_ADMIN
- iperf3

## Sources Consulted
- Linux tc-netem manual: https://man7.org/linux/man-pages/man8/tc-netem.8.html
- Linux tc-tbf manual: https://man7.org/linux/man-pages/man8/tc-tbf.8.html
- Local `tc qdisc help`, `tc qdisc add ... netem help`, and `tc qdisc add ... tbf help`
- Local `man tc` unit definitions for rates and sizes
- Docker Compose services reference: https://docs.docker.com/reference/compose-file/services/
- Docker bridge network driver documentation: https://docs.docker.com/engine/network/drivers/bridge/
- Docker network inspect CLI reference: https://docs.docker.com/reference/cli/docker/network/inspect/
- Local Docker CLI help for `docker run`, `docker inspect`, and `docker compose config`

## Issues Found
- The post said applying a root qdisc to the host-side veth controls container outgoing traffic. A root qdisc on the host-side veth affects packets leaving that host interface, which is traffic entering the container. Updated the explanation, bandwidth example, packet-loss comment, iperf3 test direction, and conclusion to distinguish host-side ingress shaping from container egress shaping.
- The alternate veth lookup used the container interface `ifindex` and did not use the assigned variable. Changed it to read `eth0/iflink` and resolve that host-side interface index with `ip -o link show`.
- TBF `burst` is a size parameter, but examples used `kbit` while describing KB-sized buffers. Changed the examples and parameter explanation to use `kb` size units.
- Child qdiscs under netem were attached with `parent 1:`. netem exposes the child class as `1:1`, so the examples now use `parent 1:1`.
- The Docker bridge lookup always overwrote a custom bridge name with the default `br-<network-id>` form. Added a conditional fallback so a configured `com.docker.network.bridge.name` is preserved.
- The cleanup note named only `pfifo_fast` or `fq_codel` as defaults. Updated it to mention defaults such as `noqueue` or `fq_codel`, which is more accurate for current systems and virtual interfaces.

## Review Notes
The Compose snippet was validated with `docker compose config -q`. The commands are Linux-specific and assume Docker bridge networking; other Docker network drivers and Docker Desktop virtualization layers may require different host-interface handling.
