# Validation Summary: How to Build Custom HTTP Transport in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- `net/http`
- `http.Transport`
- `http.RoundTripper`
- `crypto/tls`
- HTTP proxies
- HTTP/2

## Sources Consulted
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `crypto/tls` package documentation: https://pkg.go.dev/crypto/tls
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found
- Removed an unused `crypto/tls` import from the standalone `NewCustomTransport` example because it would prevent that program from compiling.
- Corrected the HTTP/2 comment for `ForceAttemptHTTP2`. The field attempts HTTP/2 when a custom dialer or TLS configuration would otherwise conservatively disable it; setting it to `true` does not disable HTTP/2.
- Removed `PreferServerCipherSuites: true` from the TLS client configuration example because current Go documentation marks `PreferServerCipherSuites` as deprecated and ignored.

## Review Notes
The remaining examples use current Go standard-library APIs. The custom TLS example's `CipherSuites` setting only affects TLS 1.0 through TLS 1.2; TLS 1.3 cipher suites are not configurable in Go. The post's code snippets are illustrative and some omit imports because they are not presented as complete standalone programs.
