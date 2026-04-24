# Validation Summary: How to Prevent Docker from Modifying iptables Rules for IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine
- Docker bridge networking
- `dockerd` daemon configuration (`daemon.json`)
- Linux `iptables`
- IPv4 NAT and forwarding

## Sources Consulted
- Docker Docs: Packet filtering and firewalls — https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Docker with iptables — https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: `dockerd` CLI reference — https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: `docker inspect` CLI reference — https://docs.docker.com/reference/cli/docker/inspect/
- Docker Docs: Bridge network driver — https://docs.docker.com/engine/network/drivers/bridge/
- `iptables-extensions(8)` — https://man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
1. **The post overstated what `"iptables": false` does.** Docker's current documentation says this setting prevents Docker from creating most firewall rules, not all of them, and notes that fully preventing Docker firewall rule creation is not possible. I updated the introduction and conclusion to reflect that behavior.

2. **The list of Docker-created chains was outdated.** The post referenced `DOCKER-ISOLATION-STAGE-1` and `DOCKER-ISOLATION-STAGE-2`, while current Docker documentation lists `DOCKER-USER`, `DOCKER-FORWARD`, `DOCKER`, `DOCKER-BRIDGE`, `DOCKER-INTERNAL`, `DOCKER-CT`, and `DOCKER-INGRESS` as the relevant custom chains. I replaced the stale chain list with the current documented set.

3. **The manual forwarding example was too broad for the behavior being described.** The original rules broadly accepted all traffic to and from `docker0`, which is wider than necessary for the "containers can reach outbound networks" explanation. I replaced them with a tighter minimal example for the default bridge that allows outbound forwarding, return traffic, and masquerading.

4. **The manual publishing example contained an inaccurate comment and a less current inspect template.** `docker run -d --name web nginx` does not publish a host port by itself, so I corrected the comment to say the container is run without `-p` and published manually afterward. I also updated the `docker inspect --format` template to Docker's current documented pattern for retrieving a container IP address and aligned the forwarding rule with conntrack-based matching.

## Review Notes
- Docker's own networking docs explicitly caution that disabling Docker firewall management is not appropriate for most users because bridge-network behavior can break unless the missing rules are recreated carefully.
- The examples in the post now correctly describe a minimal default-bridge (`docker0`) setup. If the host uses a different bridge subnet, interface names, or user-defined bridge networks, the firewall rules must be adjusted accordingly.
- Docker's bridge networking docs note that the default `bridge` network is a legacy detail and is not recommended for production use; user-defined bridge networks are generally preferred when Docker-managed networking is acceptable.
