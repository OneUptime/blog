# Validation Summary: How to Test AAAA Record Resolution with nslookup

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DNS
- IPv6
- AAAA records
- PTR reverse DNS
- nslookup
- dig
- Bash
- Windows Command Prompt and PowerShell

## Sources Consulted
- ISC BIND 9 manual pages for `nslookup` and `dig`: https://bind9.readthedocs.io/en/v9.18.45/manpages.html
- Microsoft Learn `nslookup` command documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup
- RFC 3596, DNS Extensions to Support IP Version 6: https://datatracker.ietf.org/doc/html/rfc3596
- RFC 2308, Negative Caching of DNS Queries: https://datatracker.ietf.org/doc/html/rfc2308
- RFC 8482, Minimal-Sized Responses to DNS Queries That Have QTYPE=ANY: https://datatracker.ietf.org/doc/html/rfc8482
- RFC 8880, Special Use Domain Name `ipv4only.arpa`: https://datatracker.ietf.org/doc/rfc8880/
- Google Public DNS address documentation: https://developers.google.com/speed/public-dns/docs/using
- Author profile link checked: https://github.com/nawazdhandala

## Issues Found
- The description of `Non-authoritative answer` said it was from cache. A recursive resolver can return a non-authoritative answer whether the data was cached or freshly resolved, so the wording was changed to say it is returned by a recursive resolver rather than an authoritative server.
- The interactive `set type=ANY` example said it shows all record types. RFC 8482 allows minimal or subset responses to ANY queries, so the comment now says it requests ANY and many servers return only a subset.
- The NODATA example used `ipv4only-domain.example`, which is not a real domain with A records and no AAAA records. It was replaced with `ipv4only.arpa` against `8.8.8.8`, which returns a NODATA-style "No answer" response for AAAA on non-DNS64 resolvers. A separate NXDOMAIN example was added for a nonexistent name.
- The IPv6 PTR example used `2001:db8::1`, a documentation prefix address that is not expected to have public PTR data. It was replaced with `2001:4860:4860::8888` and the matching `ip6.arpa` name, which resolves to `dns.google`.
- The Bash comparison script used `grep "Address:" | tail -1`, which could hide multiple AAAA records and print the DNS server header as if it were an answer when no AAAA record existed. It now extracts answer addresses after `Name:` lines, joins multiple records, quotes variables, and prints `No AAAA answer` when appropriate.
- The `dig` batch mode table entry listed `+batch`, which is not a valid BIND `dig` option. It was changed to `-f`, the documented batch-file option.

## Review Notes
Verified the changed `nslookup` examples locally with BIND `nslookup` 9.18.39 and checked the `dig` option with local help output. The post is technically relevant and valid after the corrections.
