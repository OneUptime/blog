# Validation Summary: How to Validate IPv4 Addresses Using Regex in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (language)
- `regexp` standard library package (RE2 engine)
- `net.ParseIP` / `net.IP.To4` from the `net` standard library package
- `testing` package (Go benchmarks)
- Regular expressions for IPv4 dotted-quad validation

## Sources Consulted
- Go `regexp` package documentation: https://pkg.go.dev/regexp
- Go `regexp/syntax` documentation: https://pkg.go.dev/regexp/syntax
- Go `net` package documentation (`ParseIP`, `IP.To4`): https://pkg.go.dev/net
- Go `testing` package benchmark documentation: https://pkg.go.dev/testing#hdr-Benchmarks
- Go 1.17 release notes (leading-zero rejection in `net.ParseIP`): https://go.dev/doc/go1.17#net
- RFC 791 (IPv4 dotted-quad representation)
- Verified regex behavior against every test case in the post using an equivalent regex engine; all 10 strict-pattern cases and the extraction example matched the claimed outputs.

## Issues Found
No technical issues found.

Specifically verified:
- The strict pattern `^(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]\d|\d)){3}$` correctly accepts 0-255 per octet and rejects leading zeros (`01`), extra/missing octets, IPv6 literals, empty strings, and leading/trailing whitespace.
- The extraction pattern with `\b` anchors correctly finds `192.168.1.50` and `10.0.0.1` in the sample log line, without producing false positives from `2026-03-20`.
- `regexp.MustCompile` is the correct API and `*regexp.Regexp` is documented as safe for concurrent use by multiple goroutines.
- `net.ParseIP(s).To4() != nil` is the idiomatic way to validate an IPv4-only string; `::1` and IPv4-in-IPv6 non-mapped addresses correctly return nil from `To4()`.
- `net.ParseIP("192.168.01.1")` returns nil in Go 1.17+ (leading-zero octets were rejected starting in Go 1.17 as part of the fix accompanying CVE-2021-29923), so the stated output `false (leading zero)` is accurate for modern Go.
- The naive pattern `^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$` does indeed match `999.999.999.999`, matching the "WRONG" comment.
- The benchmark file uses valid Go test syntax (`package main_test`, `*testing.B`, `b.N` loop) and compiles as an external test package since it references no symbols from `main`.

## Review Notes
- Minor caveat: the `net.ParseIP` leading-zero behavior described in the post is correct only for Go 1.17 and later. Readers on pre-1.17 toolchains would see `192.168.01.1` accepted. The post doesn't mention a minimum Go version, but this is a reasonable assumption given 1.17 is long-since released.
- The claim that `net.ParseIP` is "typically faster" than the compiled regex is directionally correct for IPv4-only validation on typical inputs, though the exact margin depends on Go version and input distribution. The benchmark code the post provides lets readers verify this themselves, so the claim is appropriately hedged.
- The `b.N` loop pattern is still valid; Go 1.24 introduced `b.Loop()` as a more ergonomic alternative, but the classic form remains supported and idiomatic.
