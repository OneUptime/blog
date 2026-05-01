# Validation Summary: How to Understand Dynamic Home Agent Address Discovery

## Status
validated

## Post Type
Guide

## Technologies Covered
- Mobile IPv6
- Dynamic Home Agent Address Discovery (DHAAD)
- IPv6 anycast addressing
- UMIP `mip6d`
- Python `ipaddress`
- DNS SRV records

## Sources Consulted
- RFC 6275, "Mobility Support in IPv6" (updated Mobile IPv6 spec): https://www.rfc-editor.org/rfc/rfc6275.html
- RFC 3775, "Mobility Support in IPv6" (original DHAAD specification): https://www.rfc-editor.org/rfc/rfc3775.html
- RFC 2526, "Reserved IPv6 Subnet Anycast Addresses" (Mobile IPv6 Home-Agents anycast identifier): https://www.rfc-editor.org/rfc/rfc2526
- RFC 4291, "IP Version 6 Addressing Architecture" (Subnet-Router anycast definition): https://www.rfc-editor.org/rfc/rfc4291
- RFC 5026, "Mobile IPv6 Bootstrapping in Split Scenario" (DNS-based HA discovery using SRV): https://www.rfc-editor.org/rfc/rfc5026.html
- `mip6d.conf(5)` UMIP configuration manual (documented HA interface requirements and DHAAD-related options): https://www.systutorials.com/docs/linux/man/5-mip6d.conf/

## Issues Found
- The post cited RFC 4067 as part of DHAAD. RFC 4067 is the Context Transfer Protocol and is unrelated. I changed the reference to RFC 6275, which updates RFC 3775 for Mobile IPv6.
- The example IPv6 addresses used literals like `2001:db8:home::/64`, which are not valid IPv6 syntax. I replaced them with valid documentation-prefix examples under `2001:db8:1:1::/64`.
- The anycast explanation incorrectly called the DHAAD target the subnet-router anycast address. I corrected this to the Mobile IPv6 Home-Agents anycast address defined via RFC 2526 anycast ID 126.
- The DHAAD request and reply were described as Mobility Header messages with "MH Type 7" and "MH Type 8". I corrected these to ICMPv6 Home Agent Address Discovery Request/Reply messages with Types 144 and 145 per RFC 3775/RFC 6275.
- The message format examples incorrectly included a Home Address Option. DHAAD request/reply messages do not carry that option, so I replaced the examples with the actual ICMPv6 fields and the relevant IPv6 source/destination addressing.
- The Python example used an incorrect interface identifier constant (`0xFDFFFFFFFFFFFFFF`), which produced the wrong anycast address. I corrected it to `0xFDFFFFFFFFFFFFFE` and verified that the example now outputs `2001:db8:1:1:fdff:ffff:ffff:fffe`.
- The Python example allowed prefixes shorter than `/64`, but the sample logic was explicitly a `/64`-specific construction. I restricted the example to `/64` input so the code matches the explanation.
- The UMIP configuration example used `HaRestartAfterReboot enabled;`, which is not part of the documented `mip6d.conf` interface I could verify. I replaced that block with the documented HA mode and interface declaration, and added the HA Router Advertisement requirement from the UMIP manual.
- The DNS discovery example used `_mip6._udp`, which is not the service name defined for Mobile IPv6. I corrected it to `_mip6._ipv6` per RFC 5026 and updated the example AAAA record accordingly.

## Review Notes
- RFC 6275 obsoletes RFC 3775, so future edits to this post should treat RFC 6275 as the current primary reference.
- The DNS-based section describes Mobile IPv6 bootstrapping discovery rather than DHAAD itself, but it is still a technically relevant alternative discovery mechanism when labeled that way.
