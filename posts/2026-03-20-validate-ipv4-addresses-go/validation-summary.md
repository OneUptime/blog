# Validation Summary: How to Validate IPv4 Addresses in Go

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Go (standard library)
- `net` package: `net.ParseIP`, `net.IP.To4`, `net.IPNet`, `net.CIDRMask`, `net.IPv4bcast`
- `net.IP` classification methods: `IsLoopback`, `IsPrivate`, `IsMulticast`, `IsGlobalUnicast`
- `regexp` package (RE2)
- IPv4 addressing, CIDR notation, private address ranges (RFC 1918), loopback

## Sources Consulted
- Go `net` package documentation: https://pkg.go.dev/net
- `net.ParseIP`: https://pkg.go.dev/net#ParseIP
- `net.IP.To4`: https://pkg.go.dev/net#IP.To4
- `net.IP.IsPrivate` (added in Go 1.17): https://pkg.go.dev/net#IP.IsPrivate
- `net.IP.IsGlobalUnicast`: https://pkg.go.dev/net#IP.IsGlobalUnicast
- `net.IPNet.Contains`: https://pkg.go.dev/net#IPNet.Contains
- `net.CIDRMask`: https://pkg.go.dev/net#CIDRMask
- Go `regexp` syntax: https://pkg.go.dev/regexp/syntax
- RFC 1918 (Private IPv4 address ranges)
- Go 1.17 release notes (IsPrivate addition, leading-zero rejection in ParseIP — CVE-2021-29923)

## Issues Found
No technical issues found.

All code examples are syntactically correct and use current, non-deprecated APIs:
- `net.ParseIP(s).To4() != nil` is the canonical IPv4 validation idiom. Safe even when `ParseIP` returns `nil`, because `To4()` on a nil/empty `IP` returns `nil` rather than panicking.
- Method 2's `net.IPNet{IP: net.ParseIP(...), Mask: net.CIDRMask(8, 32)}` works correctly because `IPNet.Contains` normalizes both the network IP and the argument IP via `To4()` when the mask is 4 bytes, so mixing the 16-byte IPv4-in-IPv6 form returned by `ParseIP` with a 4-byte `CIDRMask` is fine.
- Method 3 correctly notes `IsPrivate` requires Go 1.17+. The use of `net.IPv4bcast` for broadcast comparison is correct.
- Method 4's regex note is accurate: RE2 `\d` matches ASCII `[0-9]`, and the regex doesn't enforce octet range — the author explicitly flags this and recommends `net.ParseIP` for authoritative validation.
- Test-case expectations in Method 1 are all correct (including `::1` being rejected because `To4()` returns `nil` for non-IPv4-mapped IPv6).
- The conclusion's claim that `net.ParseIP` handles leading zeros is accurate: Go 1.17+ rejects IPv4 addresses with leading zeros (addressing CVE-2021-29923).

## Review Notes
- The `privateRanges` list in Method 2 includes `127.0.0.0/8` (loopback) alongside the RFC 1918 private ranges. Strictly speaking, loopback is not "private" per RFC 1918; Go's built-in `IsPrivate()` does not include it. This is a reasonable author choice for a utility that treats non-routable ranges uniformly and is not technically incorrect — just a definitional nuance worth being aware of.
- `IsPrivate()` (Method 3) requires Go 1.17 or later; the inline comment already flags this.
- Minor stylistic note (not an error): the comment on `"255.255.255.255"` says "valid (broadcast)" — it is a valid IPv4 address and is the limited broadcast address, but the test itself only checks IPv4 validity, not broadcast classification. No change needed.
