# Validation Summary: How to Configure DHCPv6 Server on pfSense

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- pfSense (2.5+)
- DHCPv6 Server & RA (stateful IPv6 address assignment)
- IPv6 (SLAAC, DHCPv6, Static)
- DHCPv6 Prefix Delegation (PD) and Track Interface
- ICMPv6 (RFC 4890 considerations)
- pfSense WebGUI navigation (System, Interfaces, Services, Firewall, Diagnostics)
- FreeBSD CLI tools (ifconfig, netstat)

## Sources Consulted
- pfSense official documentation — DHCPv6 Server & RA: https://docs.netgate.com/pfsense/en/latest/services/dhcpv6/
- pfSense official documentation — IPv6 WAN configuration: https://docs.netgate.com/pfsense/en/latest/interfaces/ipv6-wan.html
- pfSense documentation — Track Interface / IPv6 Prefix Delegation: https://docs.netgate.com/pfsense/en/latest/interfaces/ipv6-tracking.html
- pfSense documentation — Firewall Rule Methodology: https://docs.netgate.com/pfsense/en/latest/firewall/rule-methodology.html
- pfSense documentation — System / Advanced / Networking IPv6 Options
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)
- RFC 4890 — Recommendations for Filtering ICMPv6 Messages in Firewalls
- RFC 8415 — Dynamic Host Configuration Protocol for IPv6 (DHCPv6)
- FreeBSD man pages for ifconfig(8) and netstat(1) (pfSense is FreeBSD-based)
- Sibling validated posts (pfsense-ipv6-firewall-rules, pfsense-ipv6-gateway-monitoring) for cross-reference

## Issues Found
- Invalid IPv6 example addresses using non-hex labels. The post used `2001:db8:wan::2/64`, `2001:db8:wan::1`, `2001:db8:lan::100`, and `2001:db8:lan::200`. The characters `w`, `l`, and `n` are not valid hexadecimal digits, so these strings would not parse as IPv6 addresses if a reader copied them. Replaced with valid documentation-prefix addresses consistent with sibling pfSense IPv6 posts:
  - `2001:db8:wan::2/64` → `2001:db8:1::2/64`
  - `2001:db8:wan::1` → `2001:db8:1::1`
  - `2001:db8:lan::100` → `2001:db8:2::100`
  - `2001:db8:lan::200` → `2001:db8:2::200`

## Review Notes
- The pfSense WebGUI paths (System → Advanced → Networking, Interfaces → WAN/LAN, Services → DHCPv6 Server & RA, Firewall → Rules, Diagnostics → Ping/DNS Lookup/Traceroute/Command Prompt) match current pfSense documentation.
- "Track Interface" with Prefix ID 0 is the correct method for delegating an IPv6 prefix from WAN to LAN; the first /64 of the delegated prefix is used.
- The DHCPv6 server in pfSense is stateful and assigns addresses within the configured Range From / Range To, matching the post's framing of "statefully" assigning IPv6 addresses.
- DHCPv6 Prefix Delegation Sizes of /48 and /56 are common ISP options and valid choices in pfSense; users should confirm the supported delegation size with their ISP.
- The Google Public DNS IPv6 address `2001:4860:4860::8888` is correct.
- The advice to always allow ICMPv6 is correct and aligns with RFC 4890 — blocking ICMPv6 wholesale breaks Path MTU Discovery and Neighbor Discovery, which DHCPv6 clients also depend on for link operation.
- pfSense uses a single "ICMP" protocol selector in firewall rules; with TCP/IP Version set to IPv6, it filters ICMPv6 — the post's wording is accurate.
- `ifconfig em0` is a reasonable example interface name for pfSense (FreeBSD) Intel-based NICs; readers on different hardware (igb0, vmx0, vtnet0, etc.) will need to adjust.
- `netstat -rn -f inet6` is correct FreeBSD syntax for listing the IPv6 routing table.
- Future caveat: pfSense versions have continued to evolve (2.7.x CE, 2.8.x Plus). The "2.5+" prerequisite remains accurate for IPv6 feature availability, but readers should be aware that GUI labels can shift slightly between releases.
- Note for future revisions: this post focuses primarily on enabling DHCPv6, but does not deeply explore Router Advertisement (RA) modes (Managed, Assisted, Stateless DHCP) which are typically required to properly direct clients to the DHCPv6 server. That nuance could be expanded without changing technical correctness of the existing content.
