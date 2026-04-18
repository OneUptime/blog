# Validation Summary: How to Understand Unicast Addressing in IPv4

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- IPv4 addressing (unicast, broadcast, multicast, anycast)
- TCP / UDP sockets
- Python `socket` standard library
- tcpdump (BPF filter syntax)
- Mermaid diagrams

## Sources Consulted
- RFC 1122 — Requirements for Internet Hosts (0.0.0.0/8 "This network")
- RFC 1918 — Address Allocation for Private Internets (10/8, 172.16/12, 192.168/16)
- RFC 3927 — Dynamic Configuration of IPv4 Link-Local Addresses (169.254.0.0/16)
- RFC 5771 — IANA Guidelines for IPv4 Multicast Address Assignments (224.0.0.0/4)
- RFC 6890 — Special-Purpose IP Address Registries
- RFC 5737 — IPv4 Address Blocks Reserved for Documentation (203.0.113.0/24)
- Python docs: https://docs.python.org/3/library/socket.html
- tcpdump manual: https://www.tcpdump.org/manpages/tcpdump.1.html
- IANA example.com delegation record (2024 migration)

## Issues Found
- **Unicast range starting at `0.0.0.1`**: The 0.0.0.0/8 block is a reserved "This network" special-purpose range per RFC 1122 / RFC 6890. Since the author's framing says "Every public and private address outside the special-purpose ranges is unicast", listing 0.0.0.1 as unicast was inconsistent. Updated the first range to start at `1.0.0.0`.
- **`93.184.216.34` labeled as example.com**: That IP belonged to Edgecast's infrastructure and served example.com until IANA migrated example.com's hosting in May 2024. The IP no longer resolves to example.com. Updated the code example to use `23.215.0.136`, one of example.com's current IANA-managed IPs, so the `Host: example.com` HTTP request matches the destination.

## Review Notes
- The second unicast range (`128.0.0.0` to `172.15.255.255`) technically includes 169.254.0.0/16 (link-local, RFC 3927), which is a special-purpose range. The author acknowledges non-exhaustiveness with the "And most of the remaining public space" bullet, so this was left as illustrative. A future revision could call out link-local explicitly.
- 100.64.0.0/10 (Carrier-Grade NAT shared space, RFC 6598) also falls inside the second listed range and is special-purpose. Same rationale as above.
- Hardcoding an IP for example.com is inherently fragile; a future revision could use `socket.gethostbyname("example.com")` to avoid the IP-rot problem entirely.
- The tcpdump filter is correct but on modern Linux the interface may be `ens*`/`enp*s*` rather than `eth0`; this is conventional in tutorials and does not warrant a change.
- The claim "All TCP connections are inherently unicast" is accurate — TCP has no multicast/broadcast semantics, and the 4-tuple (src IP, src port, dst IP, dst port) always identifies exactly one endpoint on each side.
