# Validation Summary: How to Perform IPv4 Traceroute Using Scapy in Python

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- Scapy
- IPv4
- ICMP
- UDP
- Traceroute

## Sources Consulted
- Scapy Usage documentation: https://scapy.readthedocs.io/en/latest/usage.html
- Scapy API reference for `scapy.layers.inet.traceroute()`: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet.html
- RFC 792, Internet Control Message Protocol: https://www.rfc-editor.org/rfc/rfc792
- RFC 1812, Requirements for IP Version 4 Routers: https://www.rfc-editor.org/rfc/rfc1812
- `traceroute(8)` Linux manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html

## Issues Found
- The post did not mention that Scapy packet sending requires elevated privileges. I added a brief note so the examples match Scapy's documented execution requirements.
- The RTT example only checked the final probe's reply to decide whether the destination had been reached. I changed it to track any ICMP Echo Reply received for that TTL so the function terminates correctly.
- The UDP traceroute example started its destination-port sequence at `33435` because it used `base_port + ttl`. I corrected it to `base_port + ttl - 1` so the first probe uses the classic starting port `33434`.
- The built-in `traceroute()` example was described generically even though Scapy documents it as TCP traceroute by default. I clarified that comment to match the current API behavior.

## Review Notes
- Scapy's built-in `traceroute()` performs TCP traceroute by default; ICMP and UDP traceroute require the lower-level packet-building approach shown earlier in the post or a custom `l4` packet.
- Real traceroute output can still contain missing hops because routers and firewalls may filter or rate-limit ICMP responses.
