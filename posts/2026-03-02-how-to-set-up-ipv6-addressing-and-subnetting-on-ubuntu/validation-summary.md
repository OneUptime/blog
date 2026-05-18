# Validation Summary: How to Set Up IPv6 Addressing and Subnetting on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- IPv6 addressing model (RFC 4291)
- Netplan (Ubuntu network configuration)
- systemd-networkd (renderer)
- SLAAC / Router Advertisements (RFC 4862)
- DHCPv6
- IPv6 privacy extensions (RFC 4941 / 8981) via `use_tempaddr` sysctl
- `iproute2` (`ip -6 addr`, `ip -6 route`, `ip -6 neigh`)
- `ping6`, `traceroute6`, `dig`
- UFW / ip6tables for IPv6 firewalling
- `ndisc6` diagnostic tools

## Sources Consulted
- Netplan reference documentation — https://netplan.readthedocs.io/en/stable/netplan-yaml/
- RFC 4291 — IP Version 6 Addressing Architecture
- RFC 4193 — Unique Local IPv6 Unicast Addresses (`fc00::/7`)
- RFC 4862 — IPv6 Stateless Address Autoconfiguration (SLAAC)
- RFC 4941 / RFC 8981 — Privacy Extensions for SLAAC
- IANA IPv6 Special-Purpose Address Registry — https://www.iana.org/assignments/iana-ipv6-special-registry/
- Ubuntu package archive (`ndisc6`) — https://packages.ubuntu.com/search?keywords=ndisc6
- Linux kernel `ip-sysctl` documentation — https://docs.kernel.org/networking/ip-sysctl.html (for `use_tempaddr`, `disable_ipv6`, `accept_ra`)
- UFW manual — `/etc/default/ufw` `IPV6=yes` default

## Issues Found
1. **Invalid YAML in the static IPv6 Netplan example.** The original `eth0` block redefined `addresses:`, `routes:`, and `nameservers:` twice in the same mapping. YAML 1.1/1.2 disallows duplicate keys at the same level, and Netplan would either reject the file or silently use only the second occurrence (which already contained both IPv4 and IPv6 settings, so the first block was both redundant and a syntax error). Consolidated all three keys into single entries combining IPv4 and IPv6 settings — matches the canonical Netplan example for dual-stack hosts.
2. **`radvd-utils` is not an Ubuntu package.** `radvd` is the router-advertisement daemon (for sending RAs); there is no `radvd-utils`. The correct package for IPv6 neighbor/router-discovery client tools is `ndisc6`, which provides `rdisc6` to actively query for RAs. Replaced the `apt install radvd-utils -y` line with `sudo apt install ndisc6 -y` and added `rdisc6 eth0` as the verification command.

## Review Notes
- The `dhcp6: yes` line in the "Enabling SLAAC" section actually enables stateful DHCPv6, which is distinct from SLAAC. SLAAC happens whenever `accept-ra: true` (the default on Linux when IPv6 is up) and the upstream router emits RAs with the A-flag. The example still works in practice — most ISP CPE routers send RAs that drive SLAAC regardless of whether `dhcp6` is set — and the inline comment "SLAAC is automatic when a router sends RAs" calls this out, so no edit was needed.
- `link-local: []` in the IPv4-only example disables both IPv4 and IPv6 link-local addresses, not only IPv6. This is fine for the intent (`eth1` is IPv4-only via DHCP, and IPv4 doesn't rely on link-local) so left as-is. If a reader needs to keep IPv4 link-local while dropping only IPv6, they should use `link-local: [ipv4]`.
- `ping6` and `traceroute6` are still shipped by `iputils-ping` / `inetutils-traceroute` on current Ubuntu (24.04 LTS at time of review), though `ping6` is now a compatibility wrapper around `ping`. Both still work as documented.
- Subnet sizing facts verified: `/48` ⇒ 2^(64−48) = 65,536 `/64` subnets; `/64` ⇒ 2^64 ≈ 1.8×10^19 addresses. Address-type prefixes (`::1/128`, `fe80::/10`, `fc00::/7`, `2000::/3`, `ff00::/8`) all match IANA/RFC 4291.
- `net.ipv6.conf.*.use_tempaddr=2` is the correct sysctl value to enable privacy addresses *and* prefer them for outgoing connections (value `1` would generate them but not prefer them).
