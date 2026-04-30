# Validation Summary: How to Understand IPv4 Private Address Ranges (RFC 1918)

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- IPv4 addressing
- RFC 1918 private address space
- NAT
- Python `ipaddress`
- Linux `iptables`
- BGP route filtering

## Sources Consulted
- RFC 1918: Address Allocation for Private Internets: https://www.rfc-editor.org/rfc/rfc1918
- IANA Private-use IP addresses: https://www.iana.org/help/private-addresses
- Python `ipaddress` library documentation: https://docs.python.org/3/library/ipaddress.html
- IANA IPv4 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv4-special-registry/iana-ipv4-special-registry.xhtml
- RFC 3022: Traditional IP Network Address Translator (Traditional NAT): https://www.rfc-editor.org/rfc/rfc3022.html
- `iptables(8)` Linux manual page: https://man7.org/linux/man-pages/man8/iptables.8.html

## Issues Found
- The Python snippet used `ipaddress.IPv4Address.is_private` to identify RFC 1918 addresses. Python defines `is_private` more broadly as “not globally reachable,” so addresses such as `203.0.113.5` from TEST-NET-3 can evaluate as private there. I changed the snippet to check membership in the three RFC 1918 networks explicitly.
- The table column header said `Default Mask`, but the values shown are the masks for the RFC 1918 CIDR blocks, not classful default masks. I changed the header to `Mask`.
- The routing bullet used `nullroute` for private-source packet handling. I changed it to `filter`, which matches the RFC 1918 guidance and the accompanying `iptables` example.

## Review Notes
- The `iptables` rules are syntactically correct. On many current Linux systems, `iptables` is implemented by the nftables compatibility layer, but the commands shown remain valid.
