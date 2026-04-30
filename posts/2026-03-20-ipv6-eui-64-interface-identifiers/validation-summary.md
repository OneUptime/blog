# Validation Summary: How to Generate Modified EUI-64 Interface Identifiers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Modified EUI-64 interface identifiers
- SLAAC
- Linux IPv6 address generation
- Python

## Sources Consulted
- RFC 4291: IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291.html
- RFC 7217: A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC): https://www.rfc-editor.org/rfc/rfc7217
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Python built-in types documentation for `bytes.fromhex()`: https://docs.python.org/3/library/stdtypes.html
- `ip-link(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Local `ip link help` output for current CLI syntax verification

## Issues Found
- The post identified the U/L bit as "bit 7 of the first byte (0-indexed)", but the example and the code both flip `0x02`, which is bit 1 of the first byte when counted from the least significant bit. I corrected the text so the explanation matches RFC 4291 and the code.
- The `build_ipv6_address()` helper used `rstrip()` to remove `::` and `/64`, which is not exact-suffix removal and can corrupt valid input handling. I replaced that logic with `ipaddress.IPv6Network()` and explicit `/64` validation so the function builds correct IPv6 addresses from common SLAAC prefix inputs.
- The Linux verification snippet had an incomplete `python3 -c` example that did not actually perform the conversion. I replaced it with a complete working Python snippet that reads the MAC address from `ip link show eth0` and prints the generated IID.
- The post described Linux `addr_gen_mode=1` as stable privacy, but current kernel documentation defines mode `1` as no link-local address with EUI-64 still used for autoconf addresses. I corrected the mode descriptions and changed the privacy-address example to use mode `3`, which selects RFC 7217-based generation with a random secret if none is configured.

## Review Notes
- Modern Linux systems may use RFC 7217-based interface ID generation instead of Modified EUI-64, and the effective behavior can vary by distro or network configuration even though the kernel `addr_gen_mode` values themselves are documented.
