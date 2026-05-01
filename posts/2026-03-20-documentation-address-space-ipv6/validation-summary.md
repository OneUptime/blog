# Validation Summary: How to Use the Documentation Address Space (2001:db8::/32 and 3fff::/20) - Ipv6

## Status
validated

## Post Type
Reference guide

## Technologies Covered
- IPv6 addressing
- IETF RFC documentation prefixes
- BGP / ASN documentation ranges
- Python `ipaddress`
- Linux `ip` / `ip6tables`
- BIRD routing policy filters

## Sources Consulted
- RFC 3849, "IPv6 Address Prefix Reserved for Documentation" - https://www.rfc-editor.org/rfc/rfc3849.html
- RFC 9637, "Expanding the IPv6 Documentation Space" - https://www.rfc-editor.org/rfc/rfc9637.html
- RFC 5398, "Autonomous System (AS) Number Reservation for Documentation Use" - https://www.rfc-editor.org/rfc/rfc5398
- Python Standard Library: `ipaddress` - https://docs.python.org/3/library/ipaddress.html
- BIRD User's Guide, prefix-set syntax - https://bird.nic.cz/doc/bird-3.2.0.html
- Debian `ip-address(8)` manpage for `ip address add` syntax - https://manpages.debian.org/unstable/iproute2/ip-address.8.en.html
- Debian `interfaces(5)` manpage for `inet6 static` syntax - https://manpages.debian.org/bookworm/ifupdown/interfaces.5.en.html
- Local `ip6tables -h` output from `ip6tables v1.8.10 (nf_tables)`

## Issues Found
- The "DNS zone files" example was not valid zone-file syntax. I changed it to proper `IN AAAA` records so the snippet matches real DNS configuration syntax.
- Two example prefixes, `3fff:1000::/32` and `3fff:ffff::/32`, were outside the RFC 9637 documentation block `3fff::/20`. I replaced them with valid in-range examples.
- The post claimed `AS 65001-65534` was the documentation ASN range. RFC 5398 reserves `64496-64511` and `65536-65551` for documentation; `65001-65534` is within the private-use 16-bit range, not the documentation range.
- The Python validation test used `3fff::server`, which is not a valid IPv6 address and therefore would not demonstrate detection of the `3fff::/20` documentation block. I replaced it with `3fff::1`.

## Review Notes
The BIRD prefix-set syntax using `2001:db8::/32+` and `3fff::/20+` is valid per the BIRD filter language, and the `ip -6 addr add` and `ip6tables` examples are syntactically correct. `ip6tables` remains valid, though many modern Linux deployments prefer `nftables` for new firewall configurations.
