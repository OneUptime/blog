# Validation Summary: How to Use dig +short AAAA for Quick IPv6 DNS Lookup

## Status
validated

## Post Type
Guide

## Technologies Covered
- `dig`
- DNS
- IPv6
- AAAA records
- PTR / reverse DNS
- Bash

## Sources Consulted
- BIND 9 `dig` manual page: https://bind9.readthedocs.io/en/v9.21.20/manpages.html#dig-dns-lookup-utility
- BIND 9 DNSSEC guide: https://bind9.readthedocs.io/en/stable/dnssec-guide.html
- RFC 3596, DNS Extensions to Support IPv6: https://www.rfc-editor.org/rfc/rfc3596.html

## Issues Found
- The example `dig google.com A AAAA` does not look up both record types for the same name. In BIND `dig`, multiple lookups are separate query tuples, so the original command produced an extra-type warning and only executed the final `AAAA` lookup. I changed it to `dig google.com A google.com AAAA`.
- The example `dig +short AAAA example.com || echo "No AAAA record"` was incorrect because `dig` returns exit code `0` whenever it receives a DNS response, including `NXDOMAIN` and empty-answer cases. I replaced it with an output-based shell check.
- The TTL example could print multiple lines for multi-address answers and was broader than necessary. I changed it to `+noall +answer` and used `awk 'NR==1 ...'` so it reports the first answer TTL cleanly.
- The DNSSEC note incorrectly described `dig +dnssec` as validation and grepped for `NODATA`, which is not a literal marker that `dig` prints in normal output. I changed the text to say it requests DNSSEC records and clarified that actual validation is indicated by the resolver's `ad` flag.

## Review Notes
- `dig +short AAAA` can legitimately return multiple IPv6 addresses; the scripts in the post intentionally use `head -1` when they only want one representative answer.
- The manual IPv6 reverse-lookup example was checked against RFC 3596's nibble-reversal `ip6.arpa` format and is correct as written.
- Local checks: executed representative `dig` commands to confirm the original multi-query warning, verified `dig` exit-code behavior for successful and nonexistent lookups, confirmed `dig -x 2001:4860:4860::8888` behavior, syntax-checked both embedded Bash scripts with `bash -n`, and validated `validation.json` with `jq`.
