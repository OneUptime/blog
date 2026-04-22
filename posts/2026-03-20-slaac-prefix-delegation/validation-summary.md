# Validation Summary: How to Use DHCPv6 Prefix Delegation with SLAAC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- SLAAC and IPv6 Router Advertisements
- Linux IPv6 forwarding
- `dhcpcd`
- `radvd`
- WIDE DHCPv6 client (`dhcp6c`)
- Cisco IOS / IOS XE IPv6 prefix delegation

## Sources Consulted
- RFC 9915: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) — https://datatracker.ietf.org/doc/html/rfc9915
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) — https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862: IPv6 Stateless Address Autoconfiguration — https://datatracker.ietf.org/doc/html/rfc4862
- RFC 7084: Basic Requirements for IPv6 Customer Edge Routers — https://datatracker.ietf.org/doc/html/rfc7084
- Debian `dhcpcd.conf(5)` man page — https://manpages.debian.org/unstable/dhcpcd-base/dhcpcd.conf.5.en.html
- Debian `radvd.conf(5)` man page — https://manpages.debian.org/testing/radvd/radvd.conf.5.en.html
- WIDE DHCPv6 `dhcp6c.conf(5)` man page — https://www.mankier.com/5/dhcp6c.conf
- Cisco IOS IPv6 DHCPv6 Prefix Delegation configuration guide — https://www.cisco.com/c/en/us/td/docs/routers/asr920/configuration/guide/ipaddr-dhcp/17-1-1/b-dhcp-xe-17-1-asr920/m_ip6-dhcp-prefix-xe.html
- Cisco IOS IPv6 Generic Prefix documentation — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6_basic/configuration/15-mt/ip6b-15-mt-book/ip6-generic-prefix.html
- Cisco IOS IPv6 command reference for `ipv6 address autoconfig` — https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i1.html
- Debian and Ubuntu package metadata for `dhcpcd`, `dhcpcd-base`, and `dhcpcd5` — https://packages.debian.org/trixie/dhcpcd-base and https://launchpad.net/ubuntu/noble/+source/dhcpcd

## Issues Found
1. **Outdated RFC reference**: The introduction identified DHCPv6-PD only as RFC 3633. RFC 3633 was incorporated into later DHCPv6 specifications, and RFC 9915 is the current DHCPv6 RFC as of January 2026. Updated the introduction to say DHCPv6-PD was originally RFC 3633 and is now part of RFC 9915.
2. **Current package name for `dhcpcd`**: The Linux install command used `dhcpcd5`, which is now a transitional package on current Debian/Ubuntu releases. Changed it to install `dhcpcd`.
3. **Invalid `dhcpcd.conf` syntax**: The first `dhcpcd` example used braces around an `interface` block. Current `dhcpcd.conf` syntax uses `interface eth0` followed by indented options, without braces. Removed the braces and added the recommended `noipv6rs` plus per-WAN `ipv6rs` pattern.
4. **Non-root redirection to `/etc`**: Several examples used `cat > /etc/...` after `sudo` commands. That redirection would fail for non-root shells. Replaced those with `sudo tee ... > /dev/null`.
5. **Incorrect RA check and RA sender wording**: The post implied `dhcpcd` could send Router Advertisements and used `ip -6 route show` to check RAs. `dhcpcd` is the DHCP/SLAAC client side; an RA daemon such as `radvd` handles downstream RAs. Replaced the check with a `tcpdump` Router Advertisement capture.
6. **Incorrect static placeholder on the LAN interface**: The full Linux setup configured `static ip6_address=2001:db8::/64` as a placeholder. That would not be replaced by PD and would assign documentation-prefix addressing. Removed it and added a minimal `radvd` configuration using `prefix ::/64`, which is supported for dynamic prefixes assigned to the LAN interface.
7. **Invalid WIDE DHCPv6 lifetime syntax**: The WIDE example used `prefix ::/56 infinity/infinity;`, but `dhcp6c.conf` expects `prefix ipv6-prefix pltime [vltime];`. Changed it to `prefix ::/56 infinity;`.
8. **Invalid Cisco PD client command**: The Cisco snippet combined the general-prefix name and hint in one command (`ipv6 dhcp client pd PREFIX hint ::/56`). Cisco documents the hint and stored prefix name as separate commands. Split it into `ipv6 dhcp client pd hint ::/56` and `ipv6 dhcp client pd PREFIX`.
9. **Cisco global command placement and inline comments**: `ipv6 unicast-routing` was shown after interface configuration, and inline arrow annotations made the pasted config invalid. Moved `ipv6 unicast-routing` to global configuration context and converted inline annotations into Cisco comment lines.
10. **Delegated prefix verification on the wrong interface data**: The verification section looked for a `/56` delegated prefix in `ip -6 addr show eth0`. The delegated prefix is normally not assigned as a WAN interface address; it appears in the DHCPv6 lease and derived LAN routes/addresses. Changed verification to use `dhcpcd --dumplease eth0` for IA_PD details and `ip -6 addr show eth1` for the derived LAN /64.
11. **Misleading provider hierarchy**: The hierarchy showed ISP internal allocations as DHCPv6-PD delegation. Updated the wording to distinguish internal allocation/routing from DHCPv6-PD at the customer edge and clarified that a /64 delegation supports only one SLAAC LAN.

## Review Notes
- The WIDE DHCPv6 client remains packaged in Debian, but it is old; `dhcpcd` is the more current Linux client choice used in the primary example.
- SLAAC hosts may use EUI-64, stable privacy, or temporary privacy addresses depending on OS policy. The example host address is acceptable as an example because the important verification point is that the /64 prefix matches the delegated LAN prefix.
