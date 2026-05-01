# Validation Summary: How to Diagnose and Fix Double NAT Problems

## Status
validated

## Post Type
Troubleshooting guide / tutorial

## Technologies Covered
- IPv4 NAT / double NAT / CGNAT concepts
- Linux networking commands: `ip addr`, `ip route`, `traceroute`
- Python 3 (`subprocess`, `ipaddress`, `re`)
- Consumer router features: bridge mode, IP passthrough, DMZ, UPnP
- VPN / IPsec NAT traversal

## Sources Consulted
- RFC 1918, Address Allocation for Private Internets: https://datatracker.ietf.org/doc/html/rfc1918
- RFC 6598, IANA-Reserved IPv4 Prefix for Shared Address Space: https://datatracker.ietf.org/doc/html/rfc6598
- RFC 3022, Traditional IP Network Address Translator (Traditional NAT): https://datatracker.ietf.org/doc/html/rfc3022
- RFC 3947, Negotiation of NAT-Traversal in the IKE: https://datatracker.ietf.org/doc/html/rfc3947
- `traceroute(8)` Linux man page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- `ip-route(8)` Linux man page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Python `ipaddress` documentation: https://docs.python.org/3/library/ipaddress.html
- Python `urllib.request` documentation: https://docs.python.org/3/library/urllib.request.html

## Issues Found
- **The original detection guidance overstated what `traceroute` proves.** A private second hop is a strong clue, but it can also indicate upstream CGNAT rather than a customer-controlled double NAT. Updated the text to treat `traceroute -n` as a heuristic and to recommend confirming with the router's WAN/Internet IP.
- **The original Python example did not actually detect double NAT.** Comparing the LAN default gateway to an external IP will differ even on a normal single-router home network, so it would produce false positives. Replaced it with a Python example that inspects the first two `traceroute` hops and checks RFC1918 plus CGNAT shared space (`100.64.0.0/10`).
- **The Python snippet was mislabeled as `bash`.** Changed the code fence to `python`.
- **The verification section incorrectly claimed hop 2 should become the public IP after the fix.** That is not guaranteed; many ISPs hide or do not answer intermediate hops. Updated verification guidance to use the router WAN/Internet IP as the primary check and treat `traceroute` output as supporting evidence.
- **A few explanatory bullets were too absolute.** Tightened the wording around port forwarding, UPnP, bridge mode availability, and console NAT-type examples so the claims are technically accurate without changing the post's structure or tone.

## Review Notes
- `traceroute` syntax in the post is valid, but the utility is not installed by default on every Linux distribution; some systems provide `tracepath` instead until `traceroute` is installed.
- Python's `ipaddress.is_private` does not treat the CGNAT shared range `100.64.0.0/10` as private; the docs note that both `is_private` and `is_global` are `False` for that range. The revised snippet handles that explicitly.
- Bridge mode and IP passthrough terminology is vendor-specific. The post's wording is acceptable as a general guide.
