# Validation Summary: How to Validate IPv6 Addresses in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (net/netip standard library, introduced in Go 1.18)
- IPv6 address parsing and classification
- net/http (HTTP handler example)
- encoding/json
- github.com/go-playground/validator/v10
- Go testing package (table-driven tests)

## Sources Consulted
- Official Go net/netip documentation: https://pkg.go.dev/net/netip
- go-playground/validator v10 documentation: https://pkg.go.dev/github.com/go-playground/validator/v10
- RFC 4291 (IPv6 Addressing Architecture) — IPv4-mapped IPv6 address definitions
- RFC 4193 (Unique Local IPv6 Unicast Addresses / ULA) — referenced by IsPrivate()

## Issues Found
No technical issues found.

All APIs used in the post are accurate:
- `netip.ParseAddr`, `netip.ParsePrefix` — exist and behave as described
- `Addr.Is6()`, `Is4In6()`, `IsLoopback()`, `IsLinkLocalUnicast()`, `IsPrivate()`, `IsMulticast()`, `IsGlobalUnicast()` — all exist with documented behavior
- `validator.New()`, `RegisterValidation(tag, Func)`, `FieldLevel.Field().String()`, `validate.Struct(...)` from go-playground/validator/v10 are used correctly
- Test cases in the Basic Validation and Table-Driven Test sections produce the expected results against the current `net/netip` implementation

## Review Notes
- Minor redundancy (not an error): `addr.Is6() || addr.Is4In6()` is equivalent to just `addr.Is6()`, since `Is6()` already returns true for IPv4-mapped IPv6 addresses. The current expression is still correct and readers may find the explicit form clearer.
- `ValidateGlobalUnicast` gates on `!addr.Is6()`. Because `Is6()` includes IPv4-mapped IPv6 addresses, an input like `::ffff:192.168.1.1` will pass the initial IPv6 check and then be rejected by `IsPrivate()`. This is semantically reasonable but worth noting if stricter rejection of IPv4-mapped input is desired (would require `&& !addr.Is4In6()`).
- `go-playground/validator/v10` already ships with a built-in `ipv6` tag. The post demonstrates how to register a custom validator (`ipv6addr`), which is a valid pedagogical example but the built-in `ipv6` tag could also be used directly.
- `RegisterValidation` returns an `error` that the sample ignores. This is common in short examples but production code should check it.
- The post is accurate as of Go 1.22+ (and applies to all Go versions ≥ 1.18 that include `net/netip`).
