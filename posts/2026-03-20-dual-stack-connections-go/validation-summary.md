# Validation Summary: How to Handle Dual-Stack Connections in Go

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- IPv4
- IPv6
- Dual-stack TCP networking
- Happy Eyeballs
- `net`
- `net/http`
- `net/netip`

## Sources Consulted
- Go `net` package docs: https://pkg.go.dev/net
- Go `net/http` package docs: https://pkg.go.dev/net/http
- Go `net/netip` package docs: https://pkg.go.dev/net/netip
- Go `net` source note on dual-stack listener behavior: https://go.dev/src/net/ipsock.go
- RFC 8305, Happy Eyeballs Version 2: https://www.rfc-editor.org/rfc/rfc8305

## Issues Found
- The dual-stack server snippet did not compile because it imported `context` and `sync` without using them. I removed the unused imports.
- The server `Accept` method started two new goroutines on every call and returned whichever listener completed first. That leaves the other goroutine blocked in `Accept`, so repeated calls can accumulate stale goroutines and pending accepts. I replaced that with long-lived accept loops that feed a shared channel.
- The server IP-version helper used an unchecked `*net.TCPAddr` type assertion, which could panic for non-TCP connections. I changed it to a checked assertion and used `netip.Addr.Unmap()` so IPv4-mapped IPv6 addresses are handled explicitly.
- The original Happy Eyeballs example was labeled as RFC 8305 but launched all IPv6 attempts at once and all IPv4 attempts 250ms later, which does not match RFC 8305's staggered connection-attempt model. It also did not cancel losing connection attempts and could hang on context cancellation before the delayed IPv4 attempts started. I rewrote it as a simplified, staggered Happy Eyeballs-style dialer and adjusted the wording to say it is not a complete RFC 8305 implementation.
- The `net.Dialer` section did not compile because `fmt` was used without being imported, `context` was imported without being used, and the `dialer` variable itself was unused. It also implied that a `Control` hook was the way to express IPv6 preference. I replaced that example with a documented `net.Dialer` configuration using `FallbackDelay` and `DialContext`.
- The HTTP transport example customized `DialContext` but did not set `ForceAttemptHTTP2`, which Go's `net/http` docs say is required if you want HTTP/2 to remain enabled when using a custom dialer. I added `ForceAttemptHTTP2: true`.
- The runtime IP-version snippet only imported `net/netip` even though it used `net.Conn` and `net.TCPAddr`. I added the missing `net` import and switched the IPv4-mapped check to `Unmap()`.
- The conclusion overstated the single `[::]` listener approach as a general solution. Go's own `net` source notes platform differences for dual-stack listening, so I corrected the conclusion to say that separate `tcp4` and `tcp6` listeners are the more predictable cross-platform option.
- The conclusion also implied that client code must implement Happy Eyeballs itself. Go's `net.Dialer` docs describe built-in fast fallback support, so I corrected the wording to distinguish between Go's built-in behavior and a custom Happy Eyeballs-style dialer.

## Review Notes
- Go's `net.Dialer` documentation describes built-in fast fallback in RFC 6555 terms and exposes it through `FallbackDelay`. The revised post now distinguishes that behavior from a hand-rolled RFC 8305-style dialer.
- A local compile pass was not possible in this environment because the `go` toolchain is not installed.
