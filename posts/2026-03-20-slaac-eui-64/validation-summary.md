# Validation Summary: How to Understand EUI-64 Interface Identifier Generation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- Modified EUI-64 interface identifiers
- IEEE 802 48-bit MAC addresses
- IPv6 privacy extensions and temporary addresses
- RFC 7217 stable privacy addresses
- Linux `ip` and `sysctl` commands
- Python `ipaddress` module

## Sources Consulted
- RFC 4291, IP Version 6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8981, Temporary Address Extensions for SLAAC in IPv6: https://datatracker.ietf.org/doc/html/rfc8981
- RFC 7217, Semantically Opaque Interface Identifiers with SLAAC: https://datatracker.ietf.org/doc/rfc7217/
- RFC 8064, Recommendation on Stable IPv6 Interface Identifiers: https://datatracker.ietf.org/doc/html/rfc8064
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Linux kernel IP sysctl documentation for `use_tempaddr`: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- Local `ip -6 addr help`, `ip link help`, and `sysctl --help` output

## Issues Found
1. **Incorrect U/L bit wording**: The post described the flipped bit as "bit 6" and "7th bit from right, 2nd bit from left," then labeled the IEEE I/G and U/L bits as bit 7 and bit 6. This was confusing and incorrect for the least-significant-bit numbering used elsewhere in the article. Updated the text to describe the U/L bit as the `0x02` bit, bit 1 in least-significant-bit numbering, and clarified that the IPv6 form is a modified EUI-64 interface identifier.
2. **Broken Python address-construction example**: The original `prefix.rstrip(":") + ":" + iid` example produced `2001:db8:0211:22ff:fe33:4455`, not the stated `2001:db8::211:22ff:fe33:4455`. Replaced it with a working `ipaddress.IPv6Network` and `ipaddress.IPv6Address` example that combines the `/64` prefix with the 64-bit IID and prints the correct compressed IPv6 address.
3. **Over-broad `ff:fe` identification wording**: The Linux verification section implied that any `ff:fe` pattern definitively identifies EUI-64. Updated the wording to say this applies to EUI-64 addresses derived from 48-bit MACs and that the pattern identifies likely EUI-64 addresses.
4. **Linux privacy-extension default was too broad**: The post said privacy extensions are "disabled by default" on Linux. The kernel default is disabled for most devices, but distributions and network managers may enable or prefer privacy addresses. Updated the wording to reflect the kernel default and implementation caveat.
5. **Uniqueness wording was too absolute**: The conclusion said SLAAC produces a unique stable address. Updated this to "intended to be unique within the subnet" because duplicate address detection and local identifier reuse still matter.

## Review Notes
- The EUI-64 transformation examples and generated IIDs were verified against RFC 4291 Appendix A and by running the Python example locally.
- The `ip -6 addr show eth0`, `ip link show eth0`, and `sysctl -w net.ipv6.conf.eth0.use_tempaddr=2` commands are syntactically valid. Real systems may use interface names other than `eth0`.
- The Python example uses `assert` for simple input-length checking, which is acceptable for a tutorial snippet. Production code should raise explicit exceptions because assertions can be disabled.
