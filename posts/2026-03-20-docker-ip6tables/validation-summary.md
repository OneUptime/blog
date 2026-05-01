# Validation Summary: How to Enable ip6tables in Docker for IPv6 Network Isolation

## Status
validated

## Post Type
Guide

## Technologies Covered
- Docker Engine
- Docker bridge networking
- IPv6
- ip6tables
- netfilter-persistent / iptables-persistent

## Sources Consulted
- Docker Docs: Use IPv6 networking - https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs: Docker with iptables - https://docs.docker.com/engine/network/firewall-iptables/
- Docker Docs: Packet filtering and firewalls - https://docs.docker.com/engine/network/packet-filtering-firewalls/
- Docker Docs: Bridge network driver - https://docs.docker.com/engine/network/drivers/bridge/
- Docker Docs: Port publishing and mapping - https://docs.docker.com/engine/network/port-publishing/
- Docker Docs: dockerd reference - https://docs.docker.com/reference/cli/dockerd/
- Docker Docs: Docker Engine v27 release notes - https://docs.docker.com/engine/release-notes/27/
- Docker Docs: Docker Engine v29 release notes - https://docs.docker.com/engine/release-notes/29/
- Debian manpages: netfilter-persistent(8) - https://manpages.debian.org/trixie/netfilter-persistent/netfilter-persistent.8.en.html
- Debian manpages: iptables-save(8) / ip6tables-save(8) - https://manpages.debian.org/trixie/iptables/iptables-save.8.en.html
- Debian Sources: iptables-persistent `25-ip6tables` plugin - https://sources.debian.org/src/iptables-persistent/1.0.20/plugins/25-ip6tables/
- Local CLI help: `ip6tables --help`, `ip6tables -m conntrack -h`, `ip6tables -m limit -h`, `ip6tables-restore --help`

## Issues Found
- The introduction implied `ip6tables` must be manually enabled and cited outdated chain names. I updated it to reflect that `ip6tables` is enabled by default on current Docker bridge networks and replaced `DOCKER-ISOLATION-STAGE-1/2` with current documented chains such as `DOCKER-USER`, `DOCKER-FORWARD`, and `DOCKER`.
- The `daemon.json` example was not valid JSON because it included a `//` comment inside the JSON block. I moved the file path outside the block.
- The example `fixed-cidr-v6` used a `/80` prefix even though Docker documents that the prefix should normally be `/64` or shorter. I changed it to `/64`.
- The verification text for `ip6tables -L DOCKER` and `ip6tables -L FORWARD` described outdated chain behavior. I updated the comments to match current Docker documentation.
- `ip6tables -L -n -v` was described as listing rules in all tables, but it lists the default table unless `-t` is specified. I replaced it with `ip6tables-save`, which dumps rules across available tables.
- The post instructed readers to inspect `DOCKER-ISOLATION-STAGE-1` and `DOCKER-ISOLATION-STAGE-2`, but Docker Engine v29 removed those chains. I replaced them with current Docker-managed chains.
- Two example IPv6 prefixes, `2001:db8:blocked::/48` and `2001:db8:trusted::/48`, were syntactically invalid because `blocked` and `trusted` are not hexadecimal hextets. I replaced them with valid documentation prefixes.
- The custom-rule examples were too broad for the behavior they described. I scoped them to the container subnet so they match the stated intent more closely.
- The "rate limit IPv6 connections" example actually matched packets, not connections, and would have affected all forwarded traffic. I corrected the description to packets and tightened the example to the container subnet while preserving established traffic.
- `cat /etc/iptables/rules.v6` may fail for non-root users because the Debian `iptables-persistent` plugin writes the file with restricted permissions. I changed it to `sudo cat`.
- `sudo ip6tables-restore < /etc/iptables/rules.v6` is unreliable when the shell cannot read the redirected file before `sudo` runs. I changed it to `sudo ip6tables-restore /etc/iptables/rules.v6`, which matches the command's documented file-argument form.
- `docker info | grep -i "ip6tables"` is not a reliable current check for this setting. I replaced it with checking `daemon.json`, and noted that omitting the key leaves the default enabled behavior in place.
- `ip6tables -L FORWARD --policy` is invalid because `--policy` is the command used to set a policy, not inspect one. I replaced it with `ip6tables -L FORWARD -n -v`.
- The NAT troubleshooting command grepped for a hard-coded `fd00` prefix. I changed it to look for `MASQUERADE` or `SNAT`, which matches current Docker behavior more generally.
- The conclusion repeated outdated chain names and overstated the disabled-`ip6tables` behavior. I updated it to match current Docker documentation.

## Review Notes
- The post is now technically correct for Docker Engine using the iptables firewall backend, which remains the default. If a host is configured to use Docker's nftables backend, the rule layout differs and there is no `DOCKER-USER` chain.
- Docker's firewall rules changed significantly in Docker Engine v28 and v29. This post should be rechecked if future Engine releases change bridge-network firewall internals again.
