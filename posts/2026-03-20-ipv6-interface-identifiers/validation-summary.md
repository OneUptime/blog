# Validation Summary: How to Understand IPv6 Interface Identifiers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing
- IPv6 interface identifiers (IIDs)
- Modified EUI-64
- SLAAC
- RFC 7217 stable privacy addresses
- RFC 8981 temporary addresses
- Linux `ip` and `sysctl`
- Python

## Sources Consulted
- RFC 4291: IP Version 6 Addressing Architecture - https://www.rfc-editor.org/rfc/rfc4291
- RFC 7136: Significance of IPv6 Interface Identifiers - https://www.rfc-editor.org/rfc/rfc7136
- RFC 7217: A Method for Generating Semantically Opaque Interface Identifiers with IPv6 SLAAC - https://www.rfc-editor.org/rfc/rfc7217
- RFC 8981: Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6 - https://www.rfc-editor.org/rfc/rfc8981
- RFC 8064: Recommendation on Stable IPv6 Interface Identifiers - https://www.rfc-editor.org/rfc/rfc8064
- Linux kernel IP sysctl documentation - https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Local `ip-address(8)` man page and `ip -6 addr help` output

## Issues Found
- The description and introduction stated the IID as universally "the lower 64 bits of an IPv6 address". I corrected this to the typical `/64` unicast-subnet case, which matches standard IPv6 practice more accurately.
- The Python EUI-64 example preserved uppercase hex from the input MAC address, so it did not actually produce the documented lowercase output. I normalized the MAC string to lowercase and clarified the U/L-bit comment.
- The RFC 7217 formula used `Interface_Identifier` instead of the RFC's `Net_Iface` parameter name. I corrected the formula and the surrounding explanation.
- The temporary-address section said new random IIDs are generated "every few hours". I changed this to periodic generation because actual lifetimes are implementation- and policy-dependent.
- The U/L and I/G section treated those bits as generally meaningful for all IIDs and implied multicast IIDs. I corrected the text so it applies specifically to Modified EUI-64-derived IIDs and noted that RFC 7217/RFC 8981 IIDs do not generally assign semantics to those bits.
- The `ip -6 addr show` example annotations implied `dynamic` alone identified temporary addressing. I updated the example to use the `temporary` flag explicitly and adjusted the comments so they do not overclaim what can be inferred from the output.
- The recommendation for mobile clients listed only temporary addresses. I changed it to stable privacy plus temporary, which better reflects how temporary addresses are typically used in practice.

## Review Notes
Modern client systems commonly prefer stable, opaque IIDs for their non-temporary SLAAC address rather than MAC-derived EUI-64. RFC 8064 recommends stable IID generation schemes such as RFC 7217 for those stable addresses.
