# Validation Summary: How to Set DNS TTL Values for Optimal Caching

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- DNS TTL and recursive resolver caching
- BIND zone files
- `dig` DNS lookup commands
- DNS record types: A, AAAA, CNAME, MX, NS, TXT, and SOA
- DNS negative caching for NXDOMAIN/NODATA responses

## Sources Consulted
- RFC 1035, "Domain names - implementation and specification": https://www.rfc-editor.org/rfc/rfc1035
- RFC 2308, "Negative Caching of DNS Queries (DNS NCACHE)": https://www.rfc-editor.org/rfc/rfc2308
- BIND 9 Administrator Reference, "Configurations and Zone Files": https://bind9.readthedocs.io/en/v9.21.12/chapter3.html
- BIND 9 manual page for `dig`: https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility
- Local `dig -h` output from DiG 9.18.39

## Issues Found
- The migration verification comment said a just-fetched cached TTL could be close to 0. A just-fetched answer should be close to the configured TTL; lower values indicate a cached answer counting down. Updated the comment to say the value should be 300 or lower if already cached.
- The SOA negative TTL note said a low value reduces the impact of typos in `/etc/hosts`. DNS negative caching does not apply to local `/etc/hosts` entries. Updated the wording to refer to mistyped DNS names in code.

## Review Notes
The TTL recommendations are reasonable operational guidance, but real propagation can still vary because resolvers, clients, and applications may apply their own cache policies or TTL floors/ceilings. `named-checkzone` was not installed in the review environment, so the BIND zone-file snippet was reviewed manually against the BIND documentation.
