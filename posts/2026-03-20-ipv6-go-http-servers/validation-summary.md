# Validation Summary: How to Handle IPv6 in Go HTTP Servers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- `net/http`
- `net`
- `net/netip`
- IPv6
- HTTP servers
- Reverse-proxy client IP headers

## Sources Consulted
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `net` package documentation: https://pkg.go.dev/net
- Go `net/netip` package documentation: https://pkg.go.dev/net/netip
- RFC 8981, Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6: https://www.rfc-editor.org/rfc/rfc8981

## Issues Found
- The basic server example used `Server.ListenAndServe` with `Addr: "[::]:8080"` while describing the listener as IPv6-only. In Go, `ListenAndServe` listens on the `tcp` network, and wildcard listener behavior can vary by platform. I changed the example to `net.Listen("tcp6", "[::]:8080")` plus `Server.Serve(...)` so the code matches the explanation.
- The dual-stack example imported `context` but never used it. I removed the import because the snippet would not compile as written.
- The rate-limiter example imported `net/netip` but never used it. I removed the import because the snippet would not compile as written.
- The client-IP helper comment claimed it extracted the "real" client IP. I revised the comment to describe the actual behavior more precisely: it prefers `X-Forwarded-For` and `X-Real-IP` when present, then falls back to `RemoteAddr`.

## Review Notes
- The `/64` prefix strategy for IPv6 rate limiting is a reasonable application heuristic for clients using temporary/privacy addresses, but it is still a policy choice rather than a protocol requirement.
- The review was completed against official documentation and RFCs. The local environment did not have the `go` tool installed, so I could not run a local compile check.
