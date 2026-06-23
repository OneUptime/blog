# Validation Summary: How to Debug IPv6 Container Networking Issues

## Status
validated

## Post Type
Troubleshooting Guide / Tutorial

## Technologies Covered
- IPv6 networking (SLAAC, DHCPv6, Neighbor Discovery, link-local addressing)
- Docker (daemon configuration, bridge/overlay/macvlan drivers, networks)
- Docker Compose
- Kubernetes (pod networking, CNI, network policies)
- Linux networking tooling: `ip`, `sysctl`, `nsenter`, `ip6tables`, `tcpdump`, `ping6`/`ping -6`, `traceroute6`, `dig`, `nc`, `curl`, `brctl`, `getent`

## Sources Consulted
- Docker — Use IPv6 networking: https://docs.docker.com/engine/daemon/ipv6/
- Docker Engine version 27 release notes (ip6tables no longer experimental, enabled by default): https://docs.docker.com/engine/release-notes/27/
- Docker Engine 26.0 release notes: https://docs.docker.com/engine/release-notes/26.0/
- General IPv6 knowledge: link-local `fe80::/10`, ICMPv6/NDP message types (133–136), Google Public DNS IPv6 (`2001:4860:4860::8888` / `::8844`)

## Issues Found
No technical issues found.

The version-specific claim that drew the most scrutiny — that the `experimental: true` daemon flag was required for `ip6tables` prior to Docker v27, and that Docker v27+ enables `ip6tables` by default without it — is accurate per the Docker Engine 27.0 release notes ("ip6tables is no longer experimental and is now enabled for Linux bridge networks by default. You may remove the experimental configuration option..."). The post correctly and consistently notes this in both the prose and the inline comments.

All commands, flags, daemon.json keys (`ipv6`, `fixed-cidr-v6`, `ip6tables`, `dns`), Compose keys (`enable_ipv6`, `ipam`), `sysctl` keys (`net.ipv6.conf.all.forwarding`), procfs paths (`/proc/sys/net/ipv6/conf/*/disable_ipv6`, `forwarding`), and `nsenter`/`tcpdump` invocations were verified as syntactically correct and current. The ICMPv6 NDP type filter (`ip6[40] == 133..136`) correctly targets Router Solicitation/Advertisement and Neighbor Solicitation/Advertisement messages. The dual-stack network creation examples (two `--subnet`/`--gateway` pairs for bridge and macvlan) are valid.

## Review Notes
- The `ip6tables -m state --state ESTABLISHED,RELATED` examples use the older `state` match module. It still works on current systems, but `-m conntrack --ctstate ESTABLISHED,RELATED` is the modern preferred form. Not an error — noting for a possible future refresh.
- `brctl show` (from `bridge-utils`) is legacy/deprecated in favor of `ip link` / `bridge link`, but remains functional and widely available. Left as-is.
- Docker Compose `version: '3.8'` is obsolete under the current Compose Specification (the `version` key is ignored), but it is harmless and still parsed. No change needed.
- `2001:db8::/...` and `fd00::/...` ranges are correctly used as documentation/ULA examples rather than real routable space.
- The note recommends using ICMPv6 ACCEPT rules — correctly emphasized, since blocking ICMPv6 (PMTUD, NDP) is a frequent root cause of IPv6 breakage.
