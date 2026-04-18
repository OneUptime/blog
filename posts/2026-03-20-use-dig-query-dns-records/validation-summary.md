# Validation Summary: How to Use dig to Query DNS Records Over IPv4

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- `dig` (Domain Information Groper) — BIND 9 DNS lookup utility
- DNS record types (A, AAAA, MX, NS, TXT, CNAME, PTR, SOA, ANY)
- DNSSEC (checking disabled flag, DNSSEC records)
- DNS message flags (qr, rd, ra, aa)
- DNS diagnostics (split-horizon DNS, TTL, propagation, trace)
- Email authentication records (SPF, DMARC, DKIM)

## Sources Consulted
- `dig(1)` man page (BIND 9)
- ISC BIND 9 documentation: https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility
- RFC 1035 (DNS) — record types, message format, flags
- RFC 8482 — ANY query behavior (restricted by many resolvers)
- RFC 4033–4035 — DNSSEC

## Issues Found
- **`-b 0.0.0.0` flag mislabeled as setting "source port"** (Common dig Options section). Per the `dig(1)` man page, `-b address[#port]` sets the source IP *address* of the query, with an optional port appended via `#port`. Updated the comment to "Set source IP address (use 0.0.0.0 to let OS choose; append #port to set source port)" to accurately reflect the flag's primary purpose.

## Review Notes
- The `dig example.com ANY` command is correctly qualified as "may be restricted" — many authoritative servers and resolvers now return HINFO or a minimal response per RFC 8482.
- Flag descriptions (`qr`, `rd`, `ra`, `aa`) are accurate per RFC 1035.
- `+short`, `+trace`, `+norecurse`, `+dnssec`, `+cd`, `+time=`, `+tries=`, and `-4` options all match BIND 9 dig documentation.
- Reverse DNS syntax (`dig -x IP`) is correct; dig automatically constructs the in-addr.arpa query.
- The DMARC and DKIM query examples use standard locations (`_dmarc.<domain>`, `default._domainkey.<domain>`). Note that DKIM selectors vary by sender; `default` is only a common example, not universal — but the post doesn't claim otherwise.
- The "Maximum TTL = freshly fetched" phrasing is informal but technically correct: a cached record's displayed TTL decreases over time, so seeing the original authoritative TTL indicates a fresh fetch.
