# Validation Summary: How to Use the IPv6 Documentation Prefix (2001:db8::/32)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and documentation prefixes
- RFC 3849 and RFC 9637
- IANA IPv6 special-purpose address registry
- Linux `ip` and `ip6tables`
- Docker Compose networking
- Cisco IOS IPv6 prefix-lists
- BGP documentation ASNs

## Sources Consulted
- RFC 3849, "IPv6 Address Prefix Reserved for Documentation": https://datatracker.ietf.org/doc/html/rfc3849
- RFC 9637, "Expanding the IPv6 Documentation Space": https://datatracker.ietf.org/doc/html/rfc9637
- IANA IPv6 Special-Purpose Address Space registry: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- RFC 5737, "IPv4 Address Blocks Reserved for Documentation": https://datatracker.ietf.org/doc/html/rfc5737
- RFC 5398, "Autonomous System (AS) Number Reservation for Documentation Use": https://datatracker.ietf.org/doc/html/rfc5398
- Docker Docs, "Use IPv6 networking": https://docs.docker.com/engine/daemon/ipv6/
- Docker Docs, "Define and manage networks in Docker Compose": https://docs.docker.com/reference/compose-file/networks/
- Cisco IOS IPv6 Command Reference (`ipv6 prefix-list`): https://www.cisco.com/c/en/us/td/docs/ios/ipv6/command/reference/ipv6_book/ipv6_08.html
- `ip-address(8)` manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html
- `ip6tables(8)` manual page: https://man7.org/linux/man-pages/man8/ip6tables.8.html

## Issues Found
- The post claimed `2001:db8::/32` "is filtered by all responsible ISPs". I changed this to say it should be treated as non-routable documentation space and should not appear in production routing tables, because the RFCs require or recommend filtering behavior but do not support a universal claim about every operator's current implementation.
- The Cisco IOS example used `ip prefix-list` for an IPv6 prefix. I changed it to `ipv6 prefix-list`, which is the correct Cisco IOS IPv6 command.
- The table described the prefix as "Usable in lab/test" and implied active use was acceptable. I changed that wording to make clear it is for examples only and that ULA should be used for active lab traffic, matching RFC 9637's requirement that documentation prefixes MUST NOT be used for actual traffic.
- The table wording for internet routability and IANA assignment was tightened to match the IANA special-purpose registry more closely.
- The Linux loopback example used `ip -6 addr add ::1/128 dev lo`, which can fail on a standard Linux system because `::1/128` is already present on `lo`. I changed it to `ip -6 addr show dev lo`.
- The "Other Reserved Documentation Prefixes" section listed `3fff::/20` as new in 2023 and only included one documentation ASN range. I corrected the year to 2024 and added the second RFC 5398 documentation ASN range, `65536-65551`.

## Review Notes
- Docker's own IPv6 documentation uses `2001:db8` in examples, but explicitly tells readers to replace it with a real subnet such as ULA space for actual deployments.
- The `ip6tables` example syntax is valid, but some modern Linux distributions prefer `nftables` directly or provide `ip6tables` through the nftables compatibility layer.
