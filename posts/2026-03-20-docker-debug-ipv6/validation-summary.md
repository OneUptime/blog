# Validation Summary: How to Debug Docker IPv6 Networking Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker bridge networking
- IPv6
- `ip6tables`
- Linux packet filtering and IP forwarding

## Sources Consulted
- Docker Docs, Use IPv6 networking: https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs, Bridge network driver: https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs, Packet filtering and firewalls: https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs, Docker with iptables: https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs, `docker network create`: https://docs.docker.com/reference/cli/docker/network/create/
- Docker Docs, `docker network rm`: https://docs.docker.com/reference/cli/docker/network/rm/
- Docker Docs, `docker network disconnect`: https://docs.docker.com/reference/cli/docker/network/disconnect/
- Docker Docs, `docker network connect`: https://docs.docker.com/reference/cli/docker/network/connect/
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://www.rfc-editor.org/rfc/rfc4193

## Issues Found
- The example IPv6 subnets `fd00:fix::/64` and `fd00:icc::/64` were invalid because `fix` and `icc` are not hexadecimal IPv6 hextets. I replaced them with valid ULA examples, `fd00:20::/64` and `fd00:30::/64`.
- The post implied that daemon-wide `"ipv6": true` is required for all Docker IPv6 networking. Docker’s official docs distinguish between the default bridge, which is configured in `daemon.json`, and user-defined networks, which enable IPv6 with `docker network create --ipv6`. I corrected the introduction and conclusion to reflect that.
- The network recreation snippets removed networks that could still have attached containers. Docker’s `docker network rm` docs require containers to be disconnected first. I added `docker network disconnect -f ...` before removal and explicit reconnect steps after recreation.
- The IPv6 internet section told readers to hand-add an `ip6tables` MASQUERADE rule. Docker’s firewall docs state that bridge-network firewall and NAT rules are Docker-managed and should not be modified directly. I changed that guidance to verify that Docker’s IPv6 firewall management is enabled and restart Docker so it recreates the rules itself.
- The daemon-restart section stated that Docker `ip6tables` rules are flushed on restart. That overstates the behavior and misses the real diagnostic question, which is whether Docker recreated its managed rules after restart. I corrected the wording.
- The container-to-container IPv6 section tried to diagnose ICC by grepping `ip6tables` for the peer IPv6 address. That does not verify the `com.docker.network.bridge.enable_icc` setting. I replaced it with a direct `docker network inspect` check for the network option.

## Review Notes
- The post assumes Docker is using the iptables firewall backend. On hosts configured with Docker’s nftables backend, the equivalent diagnostics should use nftables tooling instead of `ip6tables`.
- A live Docker command check was not possible in this environment because the `docker` CLI is not installed. Command validation was done against the official Docker documentation instead.
