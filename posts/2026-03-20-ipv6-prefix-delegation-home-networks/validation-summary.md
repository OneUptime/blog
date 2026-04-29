# Validation Summary: How to Understand IPv6 Prefix Delegation in Home Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- Router Advertisements (RA)
- Stateless Address Autoconfiguration (SLAAC)
- Duplicate Address Detection (DAD)
- Linux `ip` command

## Sources Consulted
- IETF RFC 8415, "Dynamic Host Configuration Protocol for IPv6 (DHCPv6)" - https://www.rfc-editor.org/rfc/rfc8415
- IETF RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)" - https://www.rfc-editor.org/rfc/rfc4861
- IETF RFC 4862, "IPv6 Stateless Address Autoconfiguration" - https://www.rfc-editor.org/rfc/rfc4862
- IETF RFC 6177, "IPv6 Address Assignment to End Sites" - https://www.rfc-editor.org/rfc/rfc6177
- IETF RFC 8981, "Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6" - https://www.rfc-editor.org/rfc/rfc8981
- IETF RFC 8106, "IPv6 Router Advertisement Options for DNS Configuration" - https://www.rfc-editor.org/rfc/rfc8106
- Local `ip address` / `ip -6 addr show` `--help` output for command syntax verification

## Issues Found
- The example prefixes used invalid IPv6 notation such as `2001:db8:home::/56`. I replaced them with valid documentation prefixes such as `2001:db8:100::/56` because IPv6 hextets can only contain hexadecimal digits.
- The DHCPv6-PD sequence diagram used imprecise wording for the `Request` step and over-specified the reply as a single lease duration. I changed the exchange to match RFC 8415 more closely by using `Request` as the assignment request and `Reply` as granting the prefix and lifetimes.
- The `/64` section implied ISPs delegate at least `/60` or `/56`. I corrected this to say home routers work best when the ISP delegates more than a single `/64`, commonly `/60` or `/56`, which is consistent with RFC 6177 and standard SLAAC behavior.
- The router-side command was described as checking the delegated prefix, but it actually shows the global IPv6 address on the LAN interface. I rewrote the text so it accurately describes checking the LAN sub-prefix in use and kept the `ip` command syntax valid.
- The address lifetime explanation was too loose and the claim about "most ISPs" using 7-30 day lifetimes was not well supported by the standards. I replaced it with RFC 4862-accurate language about deprecated versus valid addresses and kept the renewal behavior general.
- The prefix-change section said devices update "within minutes," which is too absolute. I corrected it to explain that new addresses are autoconfigured from updated RAs while older addresses remain usable until their valid lifetimes expire.
- The host address-generation wording conflated interface identifiers with full privacy addresses. I tightened it to distinguish MAC-derived modified EUI-64 identifiers from randomized values used for temporary privacy addresses.

## Review Notes
- The RA example using `M=0` and `O=1` is technically valid. DNS information can also be delivered in Router Advertisements via RDNSS (RFC 8106), so DHCPv6 is one common option here, not the only one.
- Residential delegated prefix sizes vary by ISP. The corrected post now treats `/56` as a common example rather than a universal default.
