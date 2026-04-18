# Validation Summary: How to Understand DNS Record Types (A, AAAA, CNAME, MX, PTR, SRV)

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- DNS protocol and record types (A, AAAA, CNAME, MX, NS, SOA, PTR, TXT, SRV)
- `dig` and `nslookup` CLI tools
- Email authentication standards (SPF, DKIM, DMARC)
- SIP and XMPP service discovery via SRV records
- Reverse DNS via in-addr.arpa zones

## Sources Consulted
- RFC 1035 (Domain Names - Implementation and Specification): https://datatracker.ietf.org/doc/html/rfc1035
- RFC 2782 (DNS RR for specifying the location of services - SRV): https://datatracker.ietf.org/doc/html/rfc2782
- RFC 5321 (SMTP - MX record handling): https://datatracker.ietf.org/doc/html/rfc5321
- RFC 2308 (Negative Caching of DNS Queries - SOA negative TTL): https://datatracker.ietf.org/doc/html/rfc2308
- RFC 4035 (DNSSEC Protocol Modifications - CNAME coexistence with RRSIG/NSEC): https://datatracker.ietf.org/doc/html/rfc4035
- RFC 7208 (SPF): https://datatracker.ietf.org/doc/html/rfc7208
- RFC 7489 (DMARC): https://datatracker.ietf.org/doc/html/rfc7489
- RFC 6376 (DKIM Signatures): https://datatracker.ietf.org/doc/html/rfc6376
- RFC 6120 (XMPP Core - port 5269 for server-to-server): https://datatracker.ietf.org/doc/html/rfc6120
- RFC 3261 (SIP - port 5060): https://datatracker.ietf.org/doc/html/rfc3261
- ISC BIND `dig` manual: https://bind9.readthedocs.io/en/latest/manpages.html#dig

## Issues Found
No technical issues found.

Verified key claims:
- A/AAAA record formats and TTL/class fields are correct.
- CNAME restrictions (no coexistence except with DNSSEC RRSIG/NSEC, no apex use) are accurate per RFC 1034/4035.
- MX priority semantics (lower numeric value = higher preference) and equal-priority load balancing are correct per RFC 5321.
- SOA field order (primary-ns, admin-email, serial, refresh, retry, expire, minimum/neg-ttl) and the YYYYMMDDnn serial convention are correct.
- PTR example `34.216.184.93.in-addr.arpa.` correctly reverses `93.184.216.34`.
- `dig -x 93.184.216.34` syntax for reverse lookup is correct.
- SRV format `_service._proto.name. TTL IN SRV priority weight port target.` matches RFC 2782.
- XMPP server-to-server port 5269 and SIP port 5060 are correct.
- TXT record examples for SPF, DMARC (`_dmarc.` prefix), and DKIM (`<selector>._domainkey.` prefix) are accurate.
- ANAME/ALIAS noted correctly as non-standard, provider-specific.

## Review Notes
- The example.com IP addresses used (`93.184.216.34` IPv4 and `2606:2800:220:1:248:1893:25c8:1946` IPv6) were historically accurate for example.com. The IANA reassigned example.com's IPs in early 2025, but these remain valid for illustrative purposes.
- The statement "clients typically use the first" returned A record is a reasonable simplification; in practice, recursive resolvers often rotate the order (round-robin), and clients like glibc may sort by RFC 6724 prefix matching. Acceptable for an introductory post.
- The post does not cover newer record types like CAA (Certification Authority Authorization), HTTPS/SVCB, or DNSSEC-related records (DNSKEY, DS, RRSIG, NSEC), but the post's title scope is appropriately limited to common record types.
