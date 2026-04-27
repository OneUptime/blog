# Validation Summary: How to Configure IPv6 Firewall Rules on pfSense - Rules

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- pfSense (2.5+)
- IPv6 (SLAAC, DHCPv6, Static)
- DHCPv6 Prefix Delegation (PD) and Track Interface
- ICMPv6 (RFC 4890 considerations)
- pfSense WebGUI navigation (System, Interfaces, Services, Firewall, Diagnostics)
- FreeBSD CLI tools (ifconfig, netstat)

## Sources Consulted
- pfSense official documentation — IPv6 Configuration: https://docs.netgate.com/pfsense/en/latest/interfaces/ipv6-wan.html
- pfSense documentation — DHCPv6 Server & RA: https://docs.netgate.com/pfsense/en/latest/services/dhcpv6/
- pfSense documentation — Firewall Rules: https://docs.netgate.com/pfsense/en/latest/firewall/rule-methodology.html
- pfSense documentation — System / Advanced / Networking IPv6 Options
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32)
- RFC 4890 — Recommendations for Filtering ICMPv6 Messages in Firewalls
- FreeBSD man pages for ifconfig(8) and netstat(1) (pfSense is FreeBSD-based)
- Sibling post posts/2026-03-20-pfsense-ipv6-wan/README.md for cross-reference

## Issues Found
- Invalid IPv6 example addresses using non-hex labels. The post used `2001:db8:wan::2/64`, `2001:db8:wan::1`, `2001:db8:lan::100`, and `2001:db8:lan::200`. The characters `w`, `l`, and `n` are not valid hexadecimal digits, so these strings would not parse as IPv6 addresses if a reader copied them. Replaced with valid documentation-prefix addresses consistent with the sibling pfSense IPv6 WAN post:
  - `2001:db8:wan::2/64` → `2001:db8:1::2/64`
  - `2001:db8:wan::1` → `2001:db8:1::1`
  - `2001:db8:lan::100` → `2001:db8:2::100`
  - `2001:db8:lan::200` → `2001:db8:2::200`

## Review Notes
- The pfSense WebGUI paths (System → Advanced → Networking, Interfaces → WAN/LAN, Services → DHCPv6 Server & RA, Firewall → Rules, Diagnostics → Ping/DNS Lookup/Traceroute/Command Prompt) match current pfSense documentation.
- "Track Interface" with Prefix ID 0 is the correct method for delegating an IPv6 prefix from WAN to LAN.
- The advice to always allow ICMPv6 is correct and aligns with RFC 4890 — blocking ICMPv6 wholesale breaks Path MTU Discovery and Neighbor Discovery.
- pfSense uses a single "ICMP" protocol selector in firewall rules; with TCP/IP Version set to IPv6, it filters ICMPv6 — the post's wording is accurate.
- DHCPv6 Prefix Delegation Sizes of /48 and /56 are common ISP options and are valid choices in pfSense.
- `ifconfig em0` is a reasonable example interface name for pfSense (FreeBSD) Intel-based NICs; readers on different hardware (igb0, vmx0, vtnet0, etc.) will need to adjust.
- Future caveat: pfSense versions have continued to evolve (2.7.x CE, 2.8.x Plus). The "2.5+" prerequisite remains accurate for IPv6 feature availability, but readers should be aware that GUI labels can shift slightly between releases.
