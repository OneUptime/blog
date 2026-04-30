# Validation Summary: How to Set Up GeoDNS with IPv6 AAAA Records

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS
- GeoDNS
- IPv6
- AAAA records
- PowerDNS Authoritative Server
- BIND 9
- EDNS Client Subnet (ECS)
- OneUptime

## Sources Consulted
- PowerDNS Authoritative Server, GeoIP backend docs: https://doc.powerdns.com/authoritative/backends/geoip.html
- PowerDNS Authoritative Server settings (`edns-subnet-processing`): https://doc.powerdns.com/authoritative/settings.html
- BIND 9 Administrator Reference, `view` statement: https://bind9.readthedocs.io/en/v9.20.2/reference.html
- BIND 9 `dig` man page (`+subnet`): https://bind9.readthedocs.io/en/v9.18.33/manpages.html
- ISC knowledge base, ECS support in BIND: https://kb.isc.org/docs/edns-client-subnet-ecs-for-resolver-operators-getting-started
- RFC 3596, DNS Extensions to Support IPv6: https://www.rfc-editor.org/rfc/rfc3596
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849
- RFC 5737, IPv4 Address Blocks Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc5737.html
- OneUptime monitoring product page: https://oneuptime.com/product/monitoring
- OneUptime Monitor Probe API reference: https://oneuptime.com/reference/monitor-probe
- Local Ubuntu package metadata via `apt-cache show` for `pdns-backend-geoip`, `pdns-server`, and `libmaxminddb-dev`

## Issues Found
- The introduction implied GeoDNS always keys off the end client's IP directly. I corrected that to reflect how authoritative DNS commonly uses the resolver's source IP, or EDNS Client Subnet data when a resolver supplies it.
- The PowerDNS install command included `libmaxminddb-dev`, which is a development-headers package rather than a runtime requirement for using the packaged backend. I removed it and kept the backend package install step.
- The PowerDNS YAML example used an undocumented nested `aaaa` mapping structure. PowerDNS's GeoIP backend uses normal `records` plus `services` entries, so I rewrote the example to match the documented backend format.
- The PowerDNS apex NS example used a list under a single `ns` key. The backend documentation shows repeated `ns` records instead, so I changed the example to use separate NS entries.
- The PowerDNS testing guidance relied on EDNS Client Subnet but the `pdns.conf` example did not enable `edns-subnet-processing`. I added that setting because PowerDNS documents it as required for ECS-aware backend decisions.
- Multiple IPv6 examples were invalid literals or prefixes, including `2001:db8:us::1`, `2001:db8:eu::1`, `2001:db8:ap::1`, and similar ACL prefixes. I replaced them with valid addresses from the `2001:db8::/32` documentation prefix.
- The BIND section described `view` as geographic routing without clarifying that views match client or resolver subnets, not MaxMind-style geolocation. I corrected the wording and subnet examples to reflect how `match-clients` actually works.
- The BIND "zone files" were only partial record fragments and would not be valid master zone files as shown. I added minimal SOA and NS records so the examples are technically complete.
- The testing section suggested `dig +subnet=` as a general test method for both PowerDNS and BIND. Current ISC documentation says authoritative ECS support was removed from BIND 9.13.0 onward, so I limited ECS testing guidance to PowerDNS and clarified how BIND views must be tested.

## Review Notes
- MaxMind documents IP geolocation as inherently imprecise, so regional routing examples should be treated as approximate traffic steering rather than exact end-user placement.
- The `REAL_PUBLIC_SUBNET`, `REAL_PUBLIC_IPV4`, and `REAL_PUBLIC_IPV6_PREFIX` values in the test commands are intentional placeholders; they need to be replaced with routable addresses or prefixes that geolocate to the target region.
