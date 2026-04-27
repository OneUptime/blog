# Validation Summary: How to Parse IPv6 Addresses in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (programming language)
- `net/netip` package (`Addr`, `ParseAddr`, `ParsePrefix`, `Prefix`, `Is6`, `Is4In6`, `Masked`)
- `net/url` package (`url.Parse`, `Hostname`, `Port`)
- `regexp`, `bufio`, `os`, `strings`, `fmt` standard library packages
- IPv6 addressing concepts: zone IDs, IPv4-mapped addresses, CIDR, RFC 5952 canonical form, RFC 6874 zone-ID URL encoding

## Sources Consulted
- Go standard library docs for `net/netip`: https://pkg.go.dev/net/netip
- Go standard library docs for `net/url`: https://pkg.go.dev/net/url (Hostname/Port semantics, IPv6 + zone-ID handling)
- Go specification on unused imports: https://go.dev/ref/spec (compile error for imported-and-not-used packages)
- RFC 5952 (recommended IPv6 text representation — the canonical form `Addr.String()` produces)
- RFC 6874 (representing IPv6 zone identifiers in URIs, requiring `%25` encoding of `%`)
- RFC 4291 (IPv6 addressing architecture, including IPv4-mapped `::ffff:0:0/96` block)

## Issues Found
- **Unused `"net"` import in the "Parsing IPv6 from URLs" example.** The import block listed `"net"` alongside `"net/url"` and `"net/netip"`, but `net` was never referenced. Go treats unused imports as a compile error (`imported and not used: "net"`), so the snippet would not build. Removed the `"net"` line; the rest of the example continues to work since only `net/url` and `net/netip` symbols are used.

## Review Notes
- The check `if !addr.Is6() && !addr.Is4In6()` in `parseIPv6` is slightly redundant because `Is4In6()` being true implies `Is6()` is true (per the `net/netip` implementation), but it is not incorrect — pure IPv4 addresses are still rejected as intended.
- In the log-extraction example, `strings.Trim(match, "[]")` is effectively a no-op because the regex character class `[0-9a-fA-F:]` doesn't capture `[` or `]`. It's harmless and could be cleaned up in a future revision.
- The IPv6 regex `[0-9a-fA-F:]{2,39}` deliberately doesn't include `.`, so IPv4-mapped forms written as `::ffff:192.0.2.1` won't be extracted from logs. The author is leaning on `netip.ParseAddr` for actual validation, which is a reasonable trade-off but worth noting.
- The URL example correctly uses `%25` for the zone delimiter per RFC 6874, and `url.Parse` + `Hostname()` correctly percent-decodes it before handing the host to `netip.ParseAddr`, which accepts zone IDs (e.g. `fe80::1%eth0`).
- `Addr.String()` returns the RFC 5952 canonical form (lowercase, longest run of zeros compressed), which matches the post's claim that all variants in the normalization example collapse to `2001:db8::1`.
