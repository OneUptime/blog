# Validation Summary: How to Calculate DNSSEC Signature Validity Periods

## Status
validated

## Post Type
Guide / Tutorial (operational best-practices with configuration examples and code)

## Technologies Covered
- DNSSEC (RRSIG, DNSKEY, KSK/ZSK, NSEC/NSEC3, key rollovers)
- BIND 9 (sig-validity-interval, dnskey-sig-validity, auto-dnssec, inline-signing)
- PowerDNS Authoritative Server (SOA-EDIT, domainmetadata, RRSIG signing)
- Knot DNS (dnssec-policy)
- NSD with ldns-signzone
- dnspython (Python monitoring script)
- Prometheus-style metrics

## Sources Consulted
- BIND 9 ARM / configuration reference — https://bind9.readthedocs.io/en/latest/reference.html
- PowerDNS Authoritative settings reference — https://doc.powerdns.com/authoritative/settings.html
- PowerDNS DNSSEC Modes of Operation (RRSIG validity window) — https://doc.powerdns.com/authoritative/dnssec/modes-of-operation.html
- PowerDNS Domain Metadata — https://doc.powerdns.com/authoritative/domainmetadata.html
- ldns-signzone(1) man page — https://manpages.debian.org/bullseye/ldnsutils/ldns-signzone.1.en.html
- dnspython DNSSEC / RRSIG rdata reference — https://dnspython.readthedocs.io/en/latest/rdata-subclasses.html
- Knot DNS configuration reference (dnssec-policy) — https://www.knot-dns.cz/docs/

## Issues Found

1. **NSD `ldns-signzone`: wrong flag for inception time.** The signing script used `-s "${INCEPTION}"` to set the inception date. In `ldns-signzone`, `-s` is the **NSEC3 salt** (hex string), not inception; the inception flag is `-i`. The script also passed `-n -p` (enable NSEC3 with opt-out) despite the surrounding text describing plain inception/expiration signing — this would have silently produced an opt-out NSEC3 zone with the inception string misinterpreted as the salt. Changed `-s "${INCEPTION}"` to `-i "${INCEPTION}"` and removed the stray `-n -p` so the example does what the comments describe.

2. **PowerDNS: non-existent setting and fabricated SQL.** The post claimed RRSIG validity could be set via a `signature-inception-skew=3600` directive in `pdns.conf` and via an `UPDATE domains SET settings = '{"signatures":{"validity":...}}'` SQL statement. Neither exists: `signature-inception-skew` is not a PowerDNS setting, `domains` has no JSON `settings` column for signing, and PowerDNS uses a **fixed 3-week RRSIG window** (inception ~1 week back, expiry ~2 weeks forward, rolling each Thursday) that is not configurable to an arbitrary number of days. Rewrote the section to: describe the fixed 3-week window, keep the valid `default-soa-edit`/`default-soa-edit-signed` settings (correctly framed as serial/SOA-EDIT controls), mention the real `rrsig-expiry-extend` setting (PowerDNS 5.1.3+) for extending expiry in seconds, and replace the fake SQL with an accurate `domainmetadata` per-zone `SOA-EDIT` example.

3. **BIND: mislabeled options.** A comment labeled `sig-signing-signatures`, `sig-signing-nodes`, and `sig-signing-type` as "Signature inception offset (for clock skew)." These options control **incremental (online) signing throughput per quantum** and the private record type used to track signing progress — they have nothing to do with inception offset or clock skew (named applies a fixed inception offset automatically). Corrected the comments to describe the options accurately.

4. **Python monitoring script: would not return any RRSIGs.** `dns.resolver.resolve(zone, rdtype)` does not set the EDNS DO bit, so authoritative/recursive servers do not return RRSIG records and `signatures_checked` would always be 0. Added a `dns.resolver.Resolver()` configured with `use_edns(0, dns.flags.DO, 4096)` (and the `import dns.flags`) and switched the queries to use it.

5. **Python monitoring script: wrong RRSIG expiration parsing.** The code did `datetime.datetime.strptime(str(sig.expiration), '%Y%m%d%H%M%S')`. In dnspython, `RRSIG.expiration` is an **integer POSIX timestamp** (seconds since the Unix epoch), so `str()` yields e.g. `"1769875200"`, which does not match the `YYYYMMDDHHMMSS` format and raises `ValueError`. Replaced with `datetime.datetime.utcfromtimestamp(sig.expiration)`.

## Review Notes
- The conceptual content (validity = re-sign interval + propagation + safety buffer + clock skew, ZSK/KSK characteristics, rollover timelines, NSEC vs NSEC3 opt-out, algorithm performance trade-offs, monitoring thresholds) is accurate and aligns with common DNSSEC operational guidance (e.g., RFC 6781). The worked calculations are internally consistent.
- **BIND version caveat (not changed):** In current BIND 9 (9.18/9.20), `sig-validity-interval`, `dnskey-sig-validity`, and `auto-dnssec` are obsolete/deprecated in favor of `dnssec-policy`. They still function for the legacy `auto-dnssec maintain` workflow the post describes (framed as "BIND 9.16+"), so the examples are valid for that context, but readers on newer BIND should prefer `dnssec-policy`. Left as-is since it is a deprecation caveat rather than an error.
- `datetime.datetime.utcnow()` is deprecated as of Python 3.12 (prefer `datetime.datetime.now(datetime.timezone.utc)`), but still functional. Left unchanged as it is a deprecation warning, not a correctness bug, and changing it would have introduced timezone-aware/naive comparison complications elsewhere in the script.
- The emergency `EXPIRATION=$(dig +short example.com RRSIG ...)` / `date -d "$EXPIRATION"` snippet is illustrative; GNU `date -d` will not parse a raw 14-digit `YYYYMMDDHHMMSS` string without reformatting. Left as-is since it is clearly a sketch with placeholder key globs rather than a runnable example.
