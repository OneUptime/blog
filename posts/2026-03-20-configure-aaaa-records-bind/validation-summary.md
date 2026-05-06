# Validation Summary: How to Configure AAAA Records in BIND

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS
- IPv6
- BIND 9
- DNS zone files
- `named-checkzone`
- `rndc`
- `dig`
- `nsupdate`

## Sources Consulted
- BIND 9 Administrator Reference Manual, zone file format and examples: https://bind9.readthedocs.io/en/v9.20.22/chapter3.html
- BIND 9 manual pages for `named-checkzone`, `rndc`, and `nsupdate`: https://bind9.readthedocs.io/en/v9.21.16/manpages.html
- BIND 9 Configuration Reference, `dump-file` option and default dump filename: https://bind9.readthedocs.io/en/v9.18.4/reference.html
- RFC 3596, DNS Extensions to Support IP Version 6: https://datatracker.ietf.org/doc/html/rfc3596
- RFC 2308, Negative Caching of DNS Queries (DNS NCACHE): https://datatracker.ietf.org/doc/html/rfc2308
- RFC 8482, Providing Minimal-Sized Responses to DNS Queries That Have QTYPE=ANY: https://datatracker.ietf.org/doc/html/rfc8482

## Issues Found
- The SOA example labeled the last SOA field as `Minimum TTL`. RFC 2308 redefined this field for negative caching, so I changed the comment to `Negative cache TTL`.
- The `rndc dumpdb` example hard-coded `/var/named/data/named_dump.db`, but BIND documents the dump target via the `dump-file` option and defaults only the filename (`named_dump.db`). I changed the example to reference the configured dump-file path instead of a distro-specific location.
- The verification step used `dig ANY` to query both A and AAAA records. RFC 8482 makes clear that `ANY` responses are not reliable for fetching all RRsets, so I replaced that step with a separate `dig A` query.
- The delegated-subdomain glue example used `2001:db8:sub::10`, which is not a valid IPv6 address because `sub` is not hexadecimal. I replaced it with the valid documentation address `2001:db8:1::10`.
- The `nsupdate` example used `2001:db8::new-address`, which is not a valid IPv6 literal. I replaced it with the valid documentation address `2001:db8::10`.

## Review Notes
- The overall BIND workflow in the post is correct: add the AAAA RR to the zone, increment the serial, validate with `named-checkzone`, and reload with `rndc reload`.
- Local CLI verification was limited in this environment because `named-checkzone` and `rndc` are not installed here. Their syntax and behavior were checked against ISC's published BIND manpages instead. The `dig` command ordering shown in the post was also tested locally and accepted by the installed `dig` binary.
