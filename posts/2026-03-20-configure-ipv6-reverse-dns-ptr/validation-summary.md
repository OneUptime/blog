# Validation Summary: How to Configure IPv6 Reverse DNS (PTR Records in ip6.arpa)

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- IPv6 reverse DNS (rDNS)
- `ip6.arpa` zone format (RFC 3596)
- BIND 9 (named.conf zone configuration, zone file syntax)
- `dig`, `host`, `named-checkzone`, `rndc`, `nsupdate` CLI tools
- Python `ipaddress` module

## Sources Consulted
- RFC 3596 — DNS Extensions to Support IP Version 6 (defines `ip6.arpa` and the nibble-reversed format)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (`2001:db8::/32`)
- BIND 9 Administrator Reference Manual — zone file and `named.conf` syntax
- Python 3 `ipaddress` module documentation (`IPv6Address.exploded`)
- `dig`, `host`, `nsupdate`, `named-checkzone`, `rndc` man pages

## Issues Found

1. **Prefix/zone mismatch (`/48` vs `/32`)**: The post said "For the prefix `2001:db8::/48`, create a reverse zone for `8.b.d.0.1.0.0.2.ip6.arpa`", and the zone file comment also said `Reverse zone for 2001:db8::/48`. However, `8.b.d.0.1.0.0.2.ip6.arpa` is 8 nibbles which corresponds to a `/32` zone (each nibble = 4 bits). A `/48` reverse zone would need 12 nibbles (e.g., `0.0.0.0.8.b.d.0.1.0.0.2.ip6.arpa`). The PTR records in the zone file each have 24 labels relative to the origin, which only adds up to 32 nibbles when the zone has 8 — i.e., the example is internally consistent only as `/32`. Changed both occurrences of `2001:db8::/48` to `2001:db8::/32` (which is also the correct RFC 3849 documentation prefix).

2. **Incorrect example output for `2001:db8:cafe::1`**: The post showed the output as `1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa.` — only 15 zeros after the leading `1`, which yields 28 nibble labels instead of the required 32. Verified the correct output by running the script: there should be 19 zeros between the leading `1` and `e.f.a.c`, giving `1.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.0.e.f.a.c.8.b.d.0.1.0.0.2.ip6.arpa.`. Updated the comment.

## Review Notes

- The expansion/reversal worked example for `2001:db8::1`, the SOA record format, the `named.conf` `zone` block syntax, the Python `ipaddress.ip_address(...).exploded` approach, and all CLI commands (`dig -x`, `host`, `named-checkzone`, `rndc reload`, `nsupdate`) are correct.
- The PTR record entries in the zone file (relative names of 24 nibbles for `2001:db8::1/2/3/100`) are all correct and consistent with the `/32` zone.
- Minor stylistic note (not changed): the comment "PTR records for 2001:db8::1 through 2001:db8::5" is slightly off because only `::1`, `::2`, `::3` are shown — but this is just a comment and not a technical inaccuracy.
- The `allow-update { none; };` directive in the BIND zone, combined with the later `nsupdate` example, will not actually accept updates as written; readers attempting dynamic updates will need to use `allow-update` with a key/ACL. The post does not claim otherwise (the dynamic-update section is presented as a separate alternative), so this is left as an implicit caveat rather than an error.
