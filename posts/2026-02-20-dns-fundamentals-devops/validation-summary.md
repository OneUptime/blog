# Validation Summary: DNS Fundamentals Every DevOps Engineer Should Know

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- DNS resolution and hierarchy
- DNS record types: A, AAAA, CNAME, MX, TXT, NS, SOA, SRV, PTR, CAA
- DNS TTL and caching
- DNS zone files
- DNSSEC
- Linux name resolution
- dig, resolvectl, and strace
- Provider-specific weighted DNS and DNS failover patterns

## Sources Consulted
- RFC 1034: Domain Names - Concepts and Facilities: https://www.rfc-editor.org/rfc/rfc1034
- RFC 1035: Domain Names - Implementation and Specification: https://www.rfc-editor.org/rfc/rfc1035
- RFC 2181: Clarifications to the DNS Specification: https://www.rfc-editor.org/rfc/rfc2181
- RFC 2308: Negative Caching of DNS Queries: https://www.rfc-editor.org/rfc/rfc2308
- RFC 8482: Providing Minimal-Sized Responses to DNS Queries That Have QTYPE=ANY: https://www.rfc-editor.org/rfc/rfc8482
- RFC 8659: DNS Certification Authority Authorization Resource Record: https://www.rfc-editor.org/rfc/rfc8659
- ISC BIND dig command help from local `dig -h`
- systemd `resolvectl --help`
- Linux `nsswitch.conf(5)` and `hosts(5)` man pages
- strace man page and local `strace -V`
- Amazon Route 53 weighted routing documentation: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/routing-policy-weighted.html
- Cloudflare Load Balancing traffic steering documentation: https://developers.cloudflare.com/load-balancing/understand-basics/traffic-steering/

## Issues Found
- Several `dig` examples used fixed `example.com` outputs that no longer match live DNS responses and could be read as literal command output. Changed them to illustrative example outputs and used documentation-prefix IP addresses where appropriate.
- The SOA `MINIMUM` field was described as a general minimum TTL. Updated it to negative caching TTL, matching the modern meaning clarified by RFC 2308.
- In-zone A records for `ns1` and `ns2` were labeled as glue records. Updated the wording to explain that these are address records in the child zone and that matching glue must exist in the parent zone for in-bailiwick name servers.
- Weighted routing was shown like standard zone-file syntax. Clarified that weights are provider-specific routing metadata, not standard DNS zone-file fields.
- DNSSEC examples implied `dig +dnssec` verifies DNSSEC by itself. Updated the wording to say it requests DNSSEC records and that validation requires inspecting RRSIG records or the AD flag from a validating resolver.
- The troubleshooting section recommended `ANY` queries for DNS amplification or misconfiguration checks. Replaced this with a note that many authoritative servers return minimal ANY responses and used a normal A query instead.
- The strace command used deprecated `trace=network` syntax. Updated it to `trace=%network`.
- CNAME wording was made more precise by saying CNAME records cannot coexist with ordinary records at the same name, allowing for DNSSEC-related record exceptions.

## Review Notes
The post is technically relevant and generally accurate after the corrections. Some DevOps patterns, such as weighted DNS and health-checked failover, remain provider-specific and resolver-cache-dependent, so exact traffic distribution should not be assumed from DNS alone.
