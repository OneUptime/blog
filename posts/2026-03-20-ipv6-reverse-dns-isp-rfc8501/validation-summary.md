# Validation Summary: How to Configure IPv6 Reverse DNS for ISPs (RFC 8501)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 reverse DNS
- DNS `PTR` records
- `ip6.arpa`
- BIND 9 configuration
- `nsupdate`
- `dig`
- Python `ipaddress`
- IPAM/DDI automation

## Sources Consulted
- RFC 8501: Reverse DNS in IPv6 for Internet Service Providers - https://datatracker.ietf.org/doc/html/rfc8501
- RFC 3596: DNS Extensions to Support IPv6 - https://datatracker.ietf.org/doc/html/rfc3596
- RFC 4472: Operational Considerations and Issues with IPv6 DNS - https://www.rfc-editor.org/rfc/rfc4472.html
- RFC 4592: The Role of Wildcards in the Domain Name System - https://datatracker.ietf.org/doc/html/rfc4592.html
- BIND 9 Configuration Reference - https://bind9.readthedocs.io/en/stable/reference.html
- BIND 9 Zone File and `$GENERATE` documentation - https://bind9.readthedocs.io/en/stable/chapter3.html
- BIND 9 manual pages for `nsupdate` and `dig` - https://bind9.readthedocs.io/en/v9.21.7/manpages.html
- Python `ipaddress` documentation - https://docs.python.org/3.15/library/ipaddress.html
- NetBox IPAM documentation - https://netbox.readthedocs.io/en/feature/features/ipam/
- NetBox IP address model documentation - https://netbox.readthedocs.io/en/stable/models/ipam/ipaddress/

## Issues Found
- The delegation script's reverse-zone calculation was broken. It mixed shell string-length expansion into Python, used the length of the input string instead of the IPv6 prefix length, and would not correctly derive the nibble-reversed `ip6.arpa` zone. I replaced it with a working Python snippet that uses `ipaddress.ip_network()`, validates nibble alignment, and derives the zone from `prefixlen`.
- The post said RFC 8501 "recommends" default PTR records for undelegated customer space. RFC 8501 actually discusses multiple valid models for non-delegated space, including wildcard PTRs, DDNS, dynamically generated answers, and valid negative responses such as `NXDOMAIN`. I corrected the wording and the summary section to match the RFC.
- The `$GENERATE` example for "all addresses in a /64" was technically incorrect and not operationally viable. A `/64` contains `2^64` addresses, so the sample `0-65535` range did not represent the whole prefix, and RFC 8501/RFC 4472 instead discuss wildcard or on-demand approaches for IPv6 reverse DNS at scale. I replaced that example with a per-prefix wildcard zone example that matches the RFC discussion.
- The verification snippet depended on an undefined `calc-zone.sh`, so it was not self-contained. I replaced it with an inline Python calculation that produces the reverse zone directly from each IPv6 prefix.
- The Python PTR automation example manually constructed the reverse owner name and did not validate input scope. I updated it to use `IPv6Address.reverse_pointer`, require an IPv6 address, verify that the address falls inside the ISP's documented `/32`, and normalize the hostname as a fully qualified domain name.
- The IPAM sentence implied that NetBox itself directly manages PTR updates in the same way as DDI platforms. I clarified the distinction by describing Infoblox/BlueCat as DDI examples and NetBox as a source-of-truth that can feed DNS automation.

## Review Notes
The examples assume nibble-aligned reverse delegations such as `/48`, `/56`, and `/64`; non-nibble-aligned IPv6 reverse delegations require different handling. Current BIND 9 documentation prefers the `primary`/`secondary` terminology, but `type master` remains valid as a synonym, so it did not require correction.
