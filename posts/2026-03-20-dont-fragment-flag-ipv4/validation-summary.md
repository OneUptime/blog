# Validation Summary: How to Use the Don't Fragment Flag in IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4
- ICMP
- Path MTU Discovery (PMTUD)
- Linux networking tools (`ip`, `ping`, `iptables` / `TCPMSS`)
- Python
- Scapy

## Sources Consulted
- RFC 791, "Internet Protocol": https://www.rfc-editor.org/rfc/rfc791.html
- RFC 792, "Internet Control Message Protocol": https://www.rfc-editor.org/rfc/rfc792
- RFC 1191, "Path MTU Discovery": https://www.rfc-editor.org/rfc/rfc1191
- Scapy Usage documentation: https://scapy.readthedocs.io/en/stable/usage.html
- Linux `ip(7)` manual page: https://man7.org/linux/man-pages/man7/ip.7.html
- Linux `ip-route(8)` manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `ping(8)` manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- Linux `iptables-extensions(8)` manual page: https://man7.org/linux/man-pages/man8/iptables-extensions.8.html

## Issues Found
- The Scapy example text implied the sample packet would commonly trigger ICMP "Fragmentation Needed". I changed it to state that the script sets DF and may receive that ICMP response only when the actual path MTU is smaller than the packet size. I also added the raw-packet privilege requirement because Scapy documents that packet sending requires elevated privileges.
- The PMTUD walkthrough oversimplified sender behavior. I changed it to match RFC 1191 more closely: the sender begins from a first-hop MTU assumption, sends with DF set on that path, and reduces its assumed PMTU after receiving ICMP type 3 code 4.
- The Linux `ip route get` note incorrectly described the command as viewing cached path MTU entries. I changed it to describe a route lookup that may include learned MTU information, which is more accurate for modern Linux because IPv4 no longer has a routing cache in the old sense.
- The TCPMSS section described MSS clamping as a "fix" for ICMP black holes and included a misleading comment about replacing `eth0` even though the rule did not specify an interface. I changed the wording to an accurate workaround description for forwarded TCP traffic and corrected the command comment.
- The final takeaway said to always clamp TCP MSS on VPN gateways. I changed this to a conditional recommendation because MSS clamping is a useful workaround when PMTUD is unreliable, not a universal requirement.

## Review Notes
- Classical IPv4 PMTUD depends on ICMP Destination Unreachable, code 4. Legacy routers can still send old-style messages without a populated next-hop MTU field, and RFC 1191 requires hosts to handle that case.
- I also verified locally that the Scapy packet syntax is valid and that the sample `flags="DF"` construction produces an IPv4 packet with the DF flag set.
