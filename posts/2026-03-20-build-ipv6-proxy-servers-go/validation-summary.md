# Validation Summary: How to Build IPv6 Proxy Servers in Go

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- IPv6 networking
- TCP proxying
- HTTP reverse proxying
- HTTP CONNECT tunneling
- Go standard library networking packages (`net`, `net/http`, `net/http/httputil`)

## Sources Consulted
- Go `net` package documentation: https://pkg.go.dev/net
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `net/http/httputil` package documentation: https://pkg.go.dev/net/http/httputil
- RFC 9110, HTTP Semantics (`CONNECT`, Section 9.3.6): https://www.rfc-editor.org/rfc/rfc9110

## Issues Found
- The TCP proxy struct comment implied that the `Network` field controlled both listener and backend address family. It only affects `net.Listen`, so the comment was corrected.
- The TCP example hard-coded a bracketed IPv6 literal while the conclusion recommended `net.JoinHostPort`. The backend address was updated to use `net.JoinHostPort`, which matches the Go `net` documentation for IPv6 host:port handling.
- The reverse proxy example customized `httputil.NewSingleHostReverseProxy` through `Director`, but current Go documentation marks `Director` as deprecated and recommends `Rewrite`. The example was updated to use `ReverseProxy{Rewrite: ...}` with `SetURL` and `SetXForwarded()`.
- The CONNECT proxy example did not compile because it imported `bufio` without using it and referenced `sync.WaitGroup` without importing `sync`. The imports were fixed.
- The CONNECT proxy accepted the target from `r.Host` without validating CONNECT authority-form syntax. It was updated to validate `r.RequestURI` with `net.SplitHostPort`, returning `400 Bad Request` for malformed targets in line with RFC 9110 CONNECT semantics.
- The CONNECT proxy copied bytes in both directions but did not half-close the TCP streams when one side finished. `CloseWrite` calls were added after each `io.Copy` to allow proper tunnel shutdown behavior.

## Review Notes
- The examples are technically correct after the fixes, but they are still minimal examples rather than production-ready proxy services.
- A production CONNECT proxy would normally add authentication, destination restrictions, or port allowlists; RFC 9110 notes the risks of tunneling to arbitrary targets.
