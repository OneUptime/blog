# Validation Summary: How to Understand the No Next Header Value in IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- IPv6 Next Header and extension headers
- RFC 8200
- Python 3 (`socket`, `struct`)
- Scapy
- `tcpdump` / libpcap filter syntax
- `ip6tables`

## Sources Consulted
- RFC 8200: Internet Protocol, Version 6 (IPv6) Specification: https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 4302: IP Authentication Header: https://www.rfc-editor.org/rfc/rfc4302.html
- IANA Protocol Numbers registry: https://www.iana.org/assignments/protocol-numbers
- Python `socket` module documentation: https://docs.python.org/3.12/library/socket.html
- Python `struct` module documentation: https://docs.python.org/3/library/struct.html
- Scapy IPv6 API reference: https://scapy.readthedocs.io/en/latest/api/scapy.layers.inet6.html
- Scapy routing / `send()` behavior documentation: https://scapy.readthedocs.io/en/stable/routing.html
- `pcap-filter(7)` reference for `ip6 protochain`: https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- Local `tcpdump` validation via `tcpdump -d 'ip6 protochain 59'`
- Local `ip6tables` match help via `ip6tables -m ipv6header -h`

## Issues Found
- The introduction and processing section implied that data after `Next Header = 59` is application-meaningful payload. I corrected this to match RFC 8200: if octets appear after that header, IPv6 ignores them, and forwarding nodes pass them on unchanged.
- The parser example treated `ESP`, `AH`, and other protocol values as if they all used the same generic extension-header length format. I narrowed the generic parsing logic to the RFC 8200 core headers, added correct `AH` length handling, and added bounds checks so the example reflects real header formats.
- The "Keep-Alive / Heartbeat" and "privacy-focused opaque payload" use-case claims were overstated and not supported by the RFC text. I changed those sections to accurate testing/diagnostic and fragmentation-oriented explanations.
- The `tcpdump` example used `ip6[6] == 59`, which only checks the IPv6 base header and misses `59` values in later extension headers. I replaced it with `ip6 protochain 59`, which follows the IPv6 header chain.
- The firewall example had inconsistent behavior: it appended a `DROP` rule before the `LOG` rule and described `INPUT` rules as "allow locally generated" traffic. I changed it to log first, then drop, both on `eth0`, so the comments match the actual rule behavior.

## Review Notes
- The Scapy example is syntactically correct, but actual transmission still depends on Scapy being installed, a usable route/interface, and sufficient privileges on the host.
- `tcpdump` `protochain` filters are the correct way to match headers beyond the IPv6 base header, but they are typically slower than fixed-offset filters.
