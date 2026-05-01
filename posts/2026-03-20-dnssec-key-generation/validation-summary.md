# Validation Summary: How to Generate DNSSEC Keys for IPv6 Zones

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNSSEC
- BIND 9
- OpenDNSSEC
- PKCS#11 / HSM integration
- Bash
- DNSKEY, DS, NSEC3, and related DNSSEC records

## Sources Consulted
- BIND 9 manual pages (`dnssec-keygen`, `dnssec-keyfromlabel`): https://bind9.readthedocs.io/en/v9.21.16/manpages.html
- BIND 9 DNSSEC Guide, manual signing examples: https://bind9.readthedocs.io/en/stable/dnssec-guide.html
- BIND 9 DNSSEC / PKCS#11 guidance: https://bind9.readthedocs.io/en/v9.21.3/chapter5.html
- OpenDNSSEC quickstart: https://opendnssec.readthedocs.io/en/latest/quickstart/
- OpenDNSSEC configuration docs (`conf.xml`, `zonelist.xml`): https://opendnssec.readthedocs.io/en/latest/configuration/confxml/ and https://opendnssec.readthedocs.io/en/latest/configuration/zonelistxml/
- OpenDNSSEC note on current vs older tooling (`ods-enforcer` vs `ods-ksmutil`): https://opendnssec.readthedocs.io/en/latest/overview-other-documentation/
- RFC 8624, Algorithm Implementation Requirements and Usage Guidance for DNSSEC: https://www.rfc-editor.org/rfc/rfc8624.html
- RFC 9276, Guidance for NSEC3 Parameter Settings: https://datatracker.ietf.org/doc/html/rfc9276.html
- RFC 8080, EdDSA for DNSSEC: https://www.rfc-editor.org/rfc/rfc8080.html
- ISC BIND 9 End-of-Life Dates: https://kb.isc.org/docs/bind-9-end-of-life-dates

## Issues Found
- The title and description implied that DNSSEC key generation is specific to “IPv6 zones”. I corrected them to make clear that the procedure applies to any DNS zone, including zones containing AAAA records.
- The KSK/ZSK explanation said the KSK “signs the ZSK (DNSKEY record)”. I corrected this to the accurate DNSSEC model: the KSK signs the DNSKEY RRset, and the ZSK signs the rest of the zone.
- The OpenDNSSEC KASP snippet used a negative `InceptionOffset`, which does not match the documented positive duration format whose value is applied as an offset into the past. I changed it to `PT3600S`.
- The OpenDNSSEC example enabled `NSEC3` `OptOut` as a generic default. I removed it because RFC 9276 limits opt-out to specific delegation-heavy zone profiles rather than recommending it broadly.
- The OpenDNSSEC command example used older `ods-ksmutil` commands and an invalid `key generate --zone` form. I updated it to the current `ods-enforcer` workflow documented by OpenDNSSEC.
- The HSM example used `dnssec-keygen` with the wrong options for referencing a PKCS#11-backed key. I replaced it with the correct `dnssec-keyfromlabel` usage.
- The verification shell script parsed every line in `.key` files with `awk`, which would misidentify flags and algorithms because comments are present above the DNSKEY record. I fixed it to read only the DNSKEY line and added a guard for an empty key directory.

## Review Notes
- The post still references `BIND 9.12+` as an Ed25519 support floor. That support statement is historically plausible, but BIND 9.12 has been end-of-life since June 2019, so current deployments should use a supported BIND branch.
