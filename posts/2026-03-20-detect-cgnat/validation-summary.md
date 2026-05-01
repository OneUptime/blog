# Validation Summary: How to Detect If You Are Behind Carrier-Grade NAT (CGNAT)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 NAT and Carrier-Grade NAT (CGNAT)
- RFC 6598 shared address space
- RFC 1918 private IPv4 addressing
- Python 3 `ipaddress`
- `curl`
- `traceroute`
- Python 3 `http.server`
- IPv6

## Sources Consulted
- RFC 6598, "IANA-Reserved IPv4 Prefix for Shared Address Space": https://www.rfc-editor.org/rfc/rfc6598
- RFC 6888, "Common Requirements for Carrier-Grade NATs (CGNs)": https://www.rfc-editor.org/rfc/rfc6888
- RFC 1918, "Address Allocation for Private Internets": https://www.rfc-editor.org/rfc/rfc1918
- RFC 4291, "IP Version 6 Addressing Architecture": https://www.rfc-editor.org/rfc/rfc4291
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- ifconfig.me command-line examples: https://ifconfig.me/
- Mullvad announcement removing port forwarding support (May 29, 2023): https://mullvad.net/en/blog/removing-the-support-for-forwarded-ports
- AirVPN port forwarding FAQ: https://airvpn.org/contents/faq_port_forwarding/
- Local CLI help: `curl --help all`
- Local CLI help: `python3 -m http.server --help`

## Issues Found
- The post described `100.64.0.0/10` as a "shared private IP" range. RFC 6598 defines it as Shared Address Space, distinct from RFC 1918 private address space, so this was corrected to "shared address."
- The Python example in Method 1 was fenced as `bash` even though it is Python code. The fence was corrected to `python`, and the surrounding comment was clarified so it accurately describes looking up the router WAN IP in the router UI before testing it.
- The external IP check used `curl -s https://ifconfig.me`, which can return either IPv4 or IPv6 depending on connectivity. Because the post is about IPv4 CGNAT detection, this was corrected to `curl -4 -s https://ifconfig.me/ip` and the surrounding explanation was updated to refer specifically to IPv4.
- The traceroute section overstated certainty by saying an early `100.64.x.x` hop confirms CGNAT. It was corrected to say this strongly suggests CGNAT and that traceroute alone is not definitive because some ISPs hide or filter hops.
- The port-forwarding test implied failure means CGNAT. It was corrected to note that failure can also indicate another upstream NAT and that host firewall rules must be correct.
- The workaround list said Mullvad offers port forwarding. Mullvad announced on May 29, 2023 that it no longer supports port forwarding, so the example was removed and replaced with a current provider example.
- The IPv6 workaround said IPv6 bypasses CGNAT entirely and that each device gets a global IPv6. This was too absolute; it was corrected to say IPv6 can avoid IPv4 CGNAT for IPv6 traffic, while inbound reachability still depends on firewall rules.
- The key takeaways said a WAN/external IP mismatch means CGNAT. That was narrowed to upstream NAT (CGNAT or double NAT), since the mismatch alone does not distinguish between those cases.

## Review Notes
- The Python `ipaddress` example is syntactically correct and worked as written when tested locally with representative addresses.
- `python3 -m http.server 8080` remains valid; local `--help` confirms the positional `port` argument and that the default bind is all interfaces.
- The `traceroute 8.8.8.8` command is standard, but hop visibility varies by ISP and network policy, so the revised wording appropriately avoids treating it as a definitive test on its own.
