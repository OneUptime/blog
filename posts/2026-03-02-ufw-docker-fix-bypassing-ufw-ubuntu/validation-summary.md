# Validation Summary: How to Configure UFW with Docker on Ubuntu (Fix Docker Bypassing UFW)

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Ubuntu
- Docker (daemon, daemon.json, docker-compose)
- UFW (Uncomplicated Firewall)
- iptables / netfilter (DOCKER, DOCKER-USER chains, nat PREROUTING/POSTROUTING)
- iptables-persistent / netfilter-persistent
- chaifeng/ufw-docker tool
- Cloud security group concepts (AWS, GCP, DigitalOcean)

## Sources Consulted
- Docker docs — "Packet filtering and firewalls" / DOCKER-USER chain: https://docs.docker.com/network/packet-filtering-firewalls/
- Docker daemon CLI reference (iptables option, daemon.json): https://docs.docker.com/reference/cli/dockerd/
- chaifeng/ufw-docker README: https://github.com/chaifeng/ufw-docker
- Ubuntu manpages — ufw(8), iptables(8), netfilter-persistent
- netfilter.org documentation (conntrack module, NAT/MASQUERADE)

## Issues Found
1. **Invalid ufw-docker syntax (Solution 4):** The post used `sudo ufw-docker allow from 192.168.1.0/24 to nginx 80`, which is not a supported ufw-docker subcommand — the tool does not implement a `from <CIDR> to <container>` form. Replaced with a note that ufw-docker has no `from` syntax, alongside the correct native `ufw route allow proto tcp from 192.168.1.0/24 to any port 80` command.
2. **Incomplete ufw-docker delete syntax:** Changed `sudo ufw-docker delete allow nginx 80` to `sudo ufw-docker delete allow nginx 80/tcp` (the README's delete examples include the protocol) and added the broader `sudo ufw-docker delete allow nginx` form which removes all rules for a container.
3. While reworking that block, added an `ufw-docker allow nginx` (all published ports) example and `ufw-docker allow nginx 443/tcp` to match the tool's documented usage patterns.

## Review Notes
- The DOCKER-USER chain is part of FORWARD, so the `-I DOCKER-USER -j DROP` plus subsequent `-I` inserts work because `iptables -I` puts each new rule at the top — the ESTABLISHED/RELATED and source-CIDR ACCEPTs end up evaluated before the DROP, which is what the author intended.
- Docker's isolation chains are technically `DOCKER-ISOLATION-STAGE-1` and `DOCKER-ISOLATION-STAGE-2` on modern Docker; the post's shorthand `DOCKER-ISOLATION` is a minor simplification but not technically wrong as a conceptual grouping.
- `version: '3'` in the docker-compose example is considered obsolete under the Compose Specification (Compose V2 ignores it with a warning) but still works — left as-is since it is not incorrect.
- The MASQUERADE rule for `172.17.0.0/16` matches the default `docker0` bridge subnet; correct.
- `net.ipv4.ip_forward=1` written to `/etc/sysctl.conf` is acceptable, though `/etc/sysctl.d/*.conf` is the more conventional placement on modern Ubuntu. Not changed since both work.
- `sudo netstat -tlnp` requires the legacy `net-tools` package on modern Ubuntu (deprecated in favor of `ss`); the post already lists `ss -tlnp` first, so this is fine.
