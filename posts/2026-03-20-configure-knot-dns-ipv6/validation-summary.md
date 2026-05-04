# Validation Summary: How to Configure Knot DNS with IPv6

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Knot DNS (authoritative DNS server by CZ.NIC)
- IPv6 (AAAA records, listening on `::`)
- DNSSEC (online signing, ECDSAP256SHA256, NSEC3)
- DNS zone files (SOA, NS, A, AAAA, MX records)
- knotc CLI (zone-status, zone-keys-load, conf-check, reload, stats)
- systemd service management (`systemctl start knot`)
- dig (DNS query tool with `-6` and `+dnssec` flags)

## Sources Consulted
- Knot DNS Configuration Reference: https://www.knot-dns.cz/docs/latest/html/reference.html
- Knot DNS knotc man page: https://www.knot-dns.cz/docs/latest/html/man_knotc.html

## Issues Found
- **Incorrect `listen:` syntax in Step 1.** The original used a nested object form with `address:` and `port:` keys:
  ```yaml
  listen:
      - address: ::
        port: 53
      - address: 0.0.0.0
        port: 53
  ```
  This is not valid Knot DNS configuration syntax. The reference manual specifies `listen` accepts `ADDR[@INT] | STR ...` — a list of `address@port` strings. Fixed it to:
  ```yaml
  listen:
      - "::@53"
      - "0.0.0.0@53"
  ```
  This matches the documented form and is consistent with the commented `# listen: [2001:db8::53@53]` example in the same block.

## Review Notes
- All `knotc` subcommands used (`conf-check`, `reload`, `zone-status`, `zone-keys-load`, `stats`) were verified against the official knotc man page and are correctly named.
- The ACL block syntax (`address: [...]`, `action: transfer`) is valid; Knot DNS accepts a single value or a list for both fields.
- The DNSSEC `policy` block (`algorithm: ECDSAP256SHA256`, `ksk-lifetime: 365d`, `zsk-lifetime: 90d`, `nsec3: on`) uses correct field names and values.
- Zone file syntax (SOA serial, TTL, NS/A/AAAA/MX records) is RFC-compliant and uses appropriate documentation address ranges (203.0.113.0/24 from RFC 5737 and 2001:db8::/32 from RFC 3849).
- The `version: "hidden"` server option is a valid Knot DNS-specific value that suppresses the version string from CHAOS class queries.
- `dig -6` correctly forces IPv6 transport for the query.
