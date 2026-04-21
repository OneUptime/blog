# Validation Summary: How to Test AAAA Record Resolution with host Command

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DNS
- IPv6
- AAAA records
- PTR records and reverse DNS
- `ip6.arpa`
- BIND `host` command
- Bash scripting

## Sources Consulted
- ISC BIND 9.20.13 manual page for `host`: https://bind9.readthedocs.io/en/v9.20.13/manpages.html#host-dns-lookup-utility
- RFC 3596, DNS Extensions to Support IP Version 6: https://datatracker.ietf.org/doc/html/rfc3596
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- Local command verification with `host` 9.18.39: `host -V`, `host example.com`, `host -t AAAA example.com`, `host -t AAAA ipv4only.example.com`, `host -t HTTPS example.com`, `host 2001:4860:4860::8888`, and explicit `-t PTR` reverse lookup tests.

## Issues Found
- The post described plain `host example.com` as querying "all records." Current BIND documentation says that when no query type is specified, `host` looks for a default set of records, not all records. Updated the wording to "default records" and added a version-aware note that newer BIND versions may also include HTTPS records.
- The `example.com` sample output used stale A and AAAA records. Updated the example output and noted that records may vary.
- The IPv6 reverse lookup section used `2001:db8::1` with an expected public PTR result. `2001:db8::/32` is reserved for documentation, so that public lookup should not be presented as a working PTR example. Replaced it with `2001:4860:4860::8888`, which currently resolves to `dns.google`, and updated the explicit `ip6.arpa` PTR query.
- The `-t PTR` example was labeled as a "shorter format," but the explicit reverse name is longer than passing the IPv6 address directly. Renamed it to an explicit PTR query.
- The verbose output example used stale AAAA data and a resolver-specific byte count/source without warning. Updated the sample and marked resolver, TTL, ID, and address data as variable.

## Review Notes
DNS answers for public domains can vary by resolver, geography, and time. The commands and flags are valid, but sample address output should remain illustrative rather than treated as fixed.
