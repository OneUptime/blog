# Validation Summary: How to Configure RPKI (Resource Public Key Infrastructure) for IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RPKI (Resource Public Key Infrastructure)
- IPv6 route origin validation
- BGP
- Route Origin Authorizations (ROAs)
- Routinator
- RPKI-to-Router (RTR) protocol
- BIRD 2
- OneUptime HTTP endpoint monitoring

## Sources Consulted
- RFC 6480, An Infrastructure to Support Secure Internet Routing: https://datatracker.ietf.org/doc/html/rfc6480
- RFC 6811, BGP Prefix Origin Validation: https://datatracker.ietf.org/doc/rfc6811/
- RFC 8210, The RPKI to Router Protocol, Version 1: https://datatracker.ietf.org/doc/html/rfc8210
- NLnet Labs Routinator Installation: https://routinator.docs.nlnetlabs.nl/en/stable/installation.html
- NLnet Labs Routinator Configuration: https://routinator.docs.nlnetlabs.nl/en/v0.15.1/configuration.html
- NLnet Labs Routinator API Endpoints: https://routinator.docs.nlnetlabs.nl/en/v0.15.1/api-endpoints.html
- NLnet Labs Routinator Building From Source: https://routinator.docs.nlnetlabs.nl/en/stable/building.html
- BIRD 2.18.1 User's Guide: https://bird.nic.cz/doc/bird-2.18.1.html
- RIPE NCC BGP Origin Validation: https://www.ripe.net/manage-ips-and-asns/resource-management/rpki/bgp-origin-validation/
- ARIN RPKI documentation: https://www.arin.net/resources/manage/rpki/
- APNIC RPKI documentation: https://www.apnic.net/manage-ip/apnic-services/resource-certification/
- OneUptime website: https://oneuptime.com/

## Issues Found

1. **Deprecated Routinator initialization command**: Replaced `routinator init --accept-arin-rpa` with `routinator config`. Routinator 0.12.0 and newer no longer require ARIN RPA initialization, and the init workflow and `--accept-arin-rpa` flag are deprecated.

2. **Cargo install command not matching official guidance**: Changed `cargo install routinator` to `cargo install --locked routinator`, which is the command documented by NLnet Labs for installing the latest Routinator release from crates.io.

3. **Incorrect BIRD RPKI remote syntax**: Changed `remote "::1" port 3323;` to `remote ::1 port 3323;`. BIRD's RPKI `remote` option accepts an IP address as an IP literal or a hostname as a quoted string; `::1` should be supplied as an IP literal.

4. **Invalid BIRD BGP example address**: Changed `2001:db8:peer::1` to `2001:db8:1::1` because `peer` is not valid hexadecimal in an IPv6 address.

5. **Missing mandatory BIRD local AS**: Added `local as 65000;` to the BGP protocol example. BIRD requires the local AS to be configured in a BGP protocol instance.

6. **Incorrect code fence language**: Changed the BIRD configuration fence from `nginx` to `text` so the snippet is not mislabeled as NGINX configuration.

## Review Notes
- The Routinator TOML options `repository-dir`, `rtr-listen`, `http-listen`, and `log-level` match current Routinator configuration documentation.
- The Routinator HTTP API examples use documented endpoints: `/api/v1/status` and `/api/v1/validity/as-number/prefix`.
- The BIRD `roa6` table, `protocol rpki`, RTR timing options, and `roa_check(rpki6, net, bgp_path.last)` usage match BIRD 2 documentation.
- RPKI provides route origin validation, not full AS-path validation; the post's focus on origin validation is correct.
- The local workspace did not have `bird` or `routinator` binaries installed, so syntax was reviewed against official documentation rather than parse-tested locally.
