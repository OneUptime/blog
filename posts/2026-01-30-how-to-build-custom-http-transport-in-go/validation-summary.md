# Validation Summary: How to Build Custom HTTP Transport in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- net/http
- http.Transport
- http.RoundTripper
- crypto/tls
- HTTP proxies
- HTTP connection pooling and timeouts

## Sources Consulted
- Go net/http package documentation: https://pkg.go.dev/net/http
- Go crypto/tls package documentation: https://pkg.go.dev/crypto/tls

## Issues Found
- The TLS section said it applied to scenarios requiring custom certificate verification, but the example did not configure custom verification. Changed the sentence to describe the example accurately as specific TLS versions or cipher suites.
- The TLS cipher suite comment did not mention that Go's `tls.Config.CipherSuites` only configures TLS 1.0-1.2 cipher suites. Added a short clarification that TLS 1.3 cipher suites are not configurable.

## Review Notes
- The local Go toolchain is not installed in this environment, so code snippets were reviewed against official Go documentation rather than compiled locally.
- The README on disk already had corrections not present in the prompt, including the accurate `ForceAttemptHTTP2` comment and removal of the deprecated `PreferServerCipherSuites` example.
