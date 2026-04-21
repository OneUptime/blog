# Validation Summary: How to Troubleshoot DNS NXDOMAIN Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- DNS
- NXDOMAIN and NOERROR/NODATA responses
- DNS negative caching
- BIND `dig`
- Linux resolver configuration
- systemd-resolved `resolvectl`

## Sources Consulted
- RFC 1035, Domain Names - Implementation and Specification: https://datatracker.ietf.org/doc/rfc1035/
- RFC 2308, Negative Caching of DNS Queries: https://datatracker.ietf.org/doc/html/rfc2308
- RFC 8482, Providing Minimal-Sized Responses to DNS Queries That Have QTYPE=ANY: https://datatracker.ietf.org/doc/html/rfc8482
- RFC 2606, Reserved Top Level DNS Names: https://datatracker.ietf.org/doc/html/rfc2606
- RFC 6761, Special-Use Domain Names: https://www.rfc-editor.org/rfc/rfc6761
- ISC BIND 9.18.39 manual pages for `dig`: https://bind9.readthedocs.io/en/v9.18.39/manpages.html
- Linux `resolv.conf(5)` manual page: https://www.man7.org/linux/man-pages/man5/resolv.conf.5.html
- systemd-resolved manual page: https://www.man7.org/linux/man-pages/man8/systemd-resolved.8.html
- Local command help for `dig` 9.18.39, `getent`, and `resolvectl`.

## Issues Found
- `dig nonexistent.example.com` was described as returning NXDOMAIN, but current DNS responses for `nonexistent.example.com` return NOERROR/NODATA. Changed the example to `nonexistent.invalid`, which RFC 6761 defines as returning NXDOMAIN.
- `dig example.com AAAA` was described as NOERROR with no answer, but `example.com` currently has AAAA records. Changed the missing-record example to `dig example.com CAA`, which demonstrates NOERROR/NODATA.
- `dig example.com ANY +short` was presented as a reliable existence check. RFC 8482 allows DNS responders to minimize ANY responses, so the post now recommends querying expected record types or SOA/NS instead.
- The search-domain example implied plain `dig db` uses `/etc/resolv.conf` search domains. BIND `dig` does not use the search list by default, so the example now uses `dig +search +showsearch db` and `getent hosts db`.
- The negative caching section said the last SOA field is the negative TTL remaining. RFC 2308 defines the negative cache TTL as `min(SOA RR TTL, SOA.MINIMUM)`, and cached responses decrement the SOA RR TTL. Updated the explanation accordingly.
- The resolver-specific NXDOMAIN section concluded that resolver differences always mean filtering. Updated it to include stale negative cache and split-horizon DNS as other plausible causes.
- The cache-bypass example used `dig @8.8.8.8`, which bypasses only the local resolver cache, not all recursive caches. Replaced it with an authoritative-server query.
- The NXDOMAIN hijacking section overwrote `/etc/resolv.conf` as a fix. Replaced that with guidance to configure OS/router DNS settings and improved the status check to inspect the DNS response code, not just empty `+short` output.

## Review Notes
The post is now technically valid for a general Linux/BIND `dig` troubleshooting workflow. `resolvectl flush-caches` applies specifically to systems using systemd-resolved; other resolver caches require different flush commands.
