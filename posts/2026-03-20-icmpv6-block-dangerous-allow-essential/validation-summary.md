# Validation Summary: How to Block Dangerous ICMPv6 While Allowing Essential Messages

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- ICMPv6
- Neighbor Discovery Protocol (NDP)
- `ip6tables`
- `ebtables`
- RA Guard
- SEND
- SAVI / IPv6 Source Guard

## Sources Consulted
- Linux `ip6tables(8)` manual: https://www.man7.org/linux/man-pages/man8/ip6tables.8.html
- Linux `iptables-extensions(8)` manual: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux `ebtables-nft(8)` manual: https://www.man7.org/linux/man-pages/man8/ebtables.8.html
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 3971, SEcure Neighbor Discovery (SEND): https://www.rfc-editor.org/rfc/rfc3971.html
- RFC 6105, IPv6 Router Advertisement Guard: https://www.rfc-editor.org/rfc/rfc6105
- RFC 6980, Security Implications of IPv6 Fragmentation with IPv6 Neighbor Discovery: https://www.rfc-editor.org/rfc/rfc6980
- RFC 7113, Implementation Advice for IPv6 Router Advertisement Guard (RA-Guard): https://www.rfc-editor.org/rfc/rfc7113
- RFC 9099, Operational Security Considerations for IPv6 Networks: https://www.ietf.org/rfc/rfc9099.html
- Cisco IPv6 First Hop Security CLI guide: https://www.cisco.com/c/en/us/td/docs/switches/campus-lan-switches-access/Catalyst-1200-and-1300-Switches/cli/C1300-cli/ipv6-first-hop-security.html

## Issues Found
- The Linux RA Guard section referenced `radvd-check`, which does not appear to be a standard Linux tool for validating or filtering Router Advertisements. I removed that reference and kept the bridge-filtering example with `ebtables`.
- The Router Advertisement `ip6tables` examples matched only the source address. RFC 4861 requires valid RA and Redirect messages to arrive with Hop Limit 255 and on-link router semantics, so I added interface scoping and `-m hl --hl-eq 255`, and I reworded the text to describe the rules as a best-effort host-side allowlist.
- The Neighbor Solicitation flooding description said the target would "respond to all" probes to non-existent addresses. I changed that to describe neighbor-discovery state exhaustion on hosts or first-hop routers, which better matches the documented operational problem.
- The MLD Query attack description said forged queries "suppress multicast listeners". I changed it to the more accurate effect of manipulating listener timers and multicast control traffic.
- The neighbor-cache-poisoning section recommended blanket NS/NA rate limiting with `DROP` rules on a host firewall. Those messages are required for IPv6 neighbor discovery, and RFC 4890 says they normally should not be dropped for local configuration traffic. I replaced that advice with a warning against blanket NS/NA drops and kept targeted Redirect filtering instead.
- The Redirect example used the system default-gateway lookup directly, but RFC 4861 validates redirects against the current first-hop router and requires Hop Limit 255. I changed the example to match a trusted router link-local address on the LAN interface and added hop-limit checking.
- The SEND section named `RA Guard + DHCP snooping` as the practical alternative. DHCP snooping or DHCPv6-Shield addresses rogue DHCPv6, not Neighbor Advertisement spoofing, so I replaced it with `RA Guard + SAVI / IPv6 Source Guard`.

## Review Notes
- `ip6tables` commands remain valid on modern Linux, but many systems implement them through the `nf_tables` backend rather than the legacy xtables backend.
- Modern RA Guard deployments should also account for fragmentation-related evasion techniques; RFC 6980 and RFC 7113 are the relevant references.
- I validated the `ip6tables` option names locally with the installed `ip6tables` binary, but I did not apply the firewall rules to a live test network in this environment.
