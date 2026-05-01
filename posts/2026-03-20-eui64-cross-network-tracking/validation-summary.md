# Validation Summary: How to Understand How EUI-64 Enables Cross-Network Tracking

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Stateless Address Autoconfiguration (SLAAC)
- Modified EUI-64 interface identifiers
- RFC 7217 stable privacy addresses
- RFC 8981 temporary addresses
- DHCPv6
- Linux `ip` command
- Python

## Sources Consulted
- RFC 2464, "Transmission of IPv6 Packets over Ethernet Networks" - https://www.rfc-editor.org/rfc/rfc2464
- RFC 4291, "IP Version 6 Addressing Architecture" - https://www.rfc-editor.org/rfc/rfc4291
- RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://www.rfc-editor.org/rfc/rfc4862
- RFC 7217, "A Method for Generating Semantically Opaque Interface Identifiers with IPv6 Stateless Address Autoconfiguration (SLAAC)" - https://www.rfc-editor.org/rfc/rfc7217
- RFC 7721, "Security and Privacy Considerations for IPv6 Address Generation Mechanisms" - https://www.rfc-editor.org/rfc/rfc7721.html
- RFC 8064, "Recommendation on Stable IPv6 Interface Identifiers" - https://www.rfc-editor.org/rfc/rfc8064
- RFC 8981, "Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6" - https://www.rfc-editor.org/rfc/rfc8981
- RFC 9915, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)" - https://www.rfc-editor.org/rfc/rfc9915.html
- Local `iproute2` help output from `ip -6 addr help` and `ip link help`

## Issues Found
- The post cited `RFC 4941` for temporary addresses even though `RFC 8981` obsoleted it in February 2021. I updated the mitigation table and conclusion to reference `RFC 8981`.
- The DHCPv6 mitigation row listed no RFC. I updated it to `RFC 9915`, which obsoleted `RFC 8415` in January 2026.
- The EUI-64 mitigation row used "Original SLAAC" instead of an RFC reference. I corrected it to `RFC 4291`.
- The introduction and description overstated EUI-64 as if SLAAC universally embedded the hardware MAC and made addressing "collision-free". I narrowed this to the early Modified EUI-64 mechanism and wording consistent with RFC 4862 and RFC 7721.
- The tracking section claimed the IID "never changes regardless of which network you join" and that vendor identification always follows. I scoped this to stable EUI-64-derived addresses and clarified that vendor inference depends on a globally assigned OUI.
- The detection section said a matching pattern means the system "is using EUI-64". I changed this to "likely using EUI-64" because the pattern is a heuristic rather than absolute proof.
- The Python example contained an unused `re` import. I removed it and aligned the bit-flip comments with the RFC terminology for the U/L bit.

## Review Notes
- The Linux command examples are valid for `iproute2` systems, but they are Linux-specific rather than cross-platform.
- RFC 8064 recommends `RFC 7217` as the default stable SLAAC IID generation scheme and recommends against embedding stable link-layer addresses in IPv6 IIDs.
