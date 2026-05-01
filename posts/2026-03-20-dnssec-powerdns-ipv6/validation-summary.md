# Validation Summary: How to Configure DNSSEC with PowerDNS for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- PowerDNS Authoritative Server
- DNSSEC
- IPv6
- `pdnsutil`
- `dig`
- `delv`
- PowerDNS HTTP API

## Sources Consulted
- PowerDNS Authoritative Server settings: https://doc.powerdns.com/authoritative/settings.html
- PowerDNS DNSSEC overview: https://doc.powerdns.com/authoritative/dnssec/index.html
- PowerDNS `pdnsutil` and DNSSEC: https://doc.powerdns.com/authoritative/dnssec/pdnsutil.html
- PowerDNS `pdnsutil` man page: https://doc.powerdns.com/authoritative/manpages/pdnsutil.1.html
- PowerDNS upgrade notes: https://doc.powerdns.com/authoritative/upgrading.html
- PowerDNS Authoritative HTTP API: https://doc.powerdns.com/authoritative/http-api/index.html
- PowerDNS zone API docs: https://doc.powerdns.com/authoritative/http-api/zone.html
- BIND 9 `delv` manual: https://bind9.readthedocs.io/en/v9.18.38/manpages.html
- RFC 4035, Protocol Modifications for the DNS Security Extensions: https://www.rfc-editor.org/rfc/rfc4035
- OneUptime IP monitor docs: https://oneuptime.com/docs/monitor/ip-monitor
- OneUptime DNSSEC monitoring guide: https://oneuptime.com/blog/post/2026-01-15-dnssec-monitoring-alerts-oneuptime/view

## Issues Found
- The post used legacy pre-5.0 `pdnsutil` command names while describing current PowerDNS behavior. I updated the prerequisite to PowerDNS Authoritative Server 5.0+ and changed the examples to the current `zone ...` and `rrset add` syntax documented by PowerDNS.
- The `enable-lua-records=yes` setting was incorrectly presented as enabling DNSSEC. Lua records are a separate PowerDNS feature; DNSSEC signing is enabled per zone with `pdnsutil zone secure`. I removed that setting from the IPv6 listening example.
- The DNSSEC key management section said PowerDNS automatically generates separate KSK and ZSK keys. Current PowerDNS defaults generate a single CSK using algorithm 13 (`ECDSAP256SHA256`). I corrected the explanation and the key review notes.
- The rectification section implied `pdnsutil` directly fixes NSEC/NSEC3 records. PowerDNS documents `zone rectify` as updating backend `auth` and `ordername` fields so the zone complies with DNSSEC settings. I corrected that explanation.
- The DS export example relied on `show-zone | grep "DS:"`, which is not the documented interface. I replaced it with `pdnsutil zone show` and `pdnsutil zone export-ds`.
- The AAAA record examples used relative owner names and the legacy `add-record` command. Current `rrset add` usage requires absolute owner names. I changed the examples to `www.example.com` and `ns1.example.com`.
- The verification section incorrectly told readers to expect the `AD` bit from an authoritative server and to validate with `delv` against that authoritative server directly. RFC 4035 defines `AD` as a validating-resolver signal, and BIND documents that `delv` sends all validation queries to the specified server rather than performing iterative resolution. I changed the direct query to `dig +dnssec +norecurse` and the `delv` example to use a validating resolver instead.

## Review Notes
- PowerDNS documents that the default algorithm used by `pdnsutil zone secure` is algorithm 13 (`ECDSAP256SHA256`), and notes that not all registrars support it. Operators should confirm registrar support before publishing DS records.
- The API example is valid for zone creation. If this post is later expanded to show API-based RRset updates on signed zones, it should also mention `api_rectify` or an equivalent rectification step after API changes.
