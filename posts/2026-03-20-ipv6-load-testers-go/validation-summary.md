# Validation Summary: How to Build IPv6 Load Testers in Go - A Practical Guide

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Go
- IPv6
- HTTP client load testing
- TCP connection testing
- Go `net`, `net/http`, `context`, and `io` packages
- DNS resolution and dual-stack hostname handling
- Load-testing tools (`wrk` and `k6`)

## Sources Consulted
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `net` package documentation: https://pkg.go.dev/net
- Go `context` package documentation: https://pkg.go.dev/context
- Go `io` package documentation: https://pkg.go.dev/io
- RFC 3986, URI Generic Syntax: https://www.rfc-editor.org/rfc/rfc3986
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 8305, Happy Eyeballs Version 2: https://www.rfc-editor.org/rfc/rfc8305.html
- Grafana k6 HTTP requests documentation: https://grafana.com/docs/k6/latest/using-k6/http-requests/
- `wrk` README: https://github.com/wg/wrk

## Issues Found
- The first example used a custom `Transport.DialContext` callback that did not use `context.Context` directly. I corrected it to the documented `func(ctx context.Context, network, addr string) (net.Conn, error)` shape and kept the IPv6-only dial by calling `DialContext` with `"tcp6"`.
- The first example set a non-nil `TLSClientConfig` solely to keep `InsecureSkipVerify` at its default `false` value. That setting was unnecessary, and Go documents that a non-nil `TLSClientConfig` may affect HTTP/2 enablement. I removed it.
- The first example measured latency immediately after `client.Get`, but Go's `net/http` client returns once response headers are received and streams the body afterward. I updated the code to drain the response body before stopping the timer so the measured latency reflects the full HTTP exchange.
- The first example closed response bodies without reading them to EOF, which Go documents can prevent persistent connection reuse. I changed it to copy the body to `io.Discard` before closing.
- The first and third examples could emit misleading `Inf`/sentinel values in edge cases such as zero successes or zero completed attempts. I added simple zero guards around those calculations.
- The dual-stack example imported `net/http` but never used it, which would not compile. I removed the unused import.
- The dual-stack example built the IPv6 target with manual bracket formatting and used `2001:db8::server` as the sample host. That string is neither a valid IPv6 literal nor a hostname that can be resolved for dual-stack testing. I replaced the address construction with `net.JoinHostPort` and switched the sample to a normal dual-stack hostname.
- The dual-stack example reported a synthetic HTTP status even though it only performed TCP connection attempts. I removed that misleading field.
- The TCP flood example used `[2001:db8::server]:80`, which is not a valid IPv6 address. I replaced it with the RFC 3849 documentation prefix example `[2001:db8::1]:80`.
- The conclusion claimed that an IPv6/IPv4 latency gap greater than 5 ms indicates routing or peering issues. That threshold is not established by the cited Go documentation or the Happy Eyeballs RFC, so I replaced it with a more accurate, contextual statement.

## Review Notes
- The examples still use documentation-only IPv6 addresses from `2001:db8::/32`, so readers must replace them with real reachable targets before running the tools.
- The dual-stack comparison sample measures TCP connection establishment time, not full HTTP request latency.
- Local compilation was not performed in this workspace because the Go toolchain is not installed.
