# Validation Summary: How to Build IPv6 Load Testers in Go

## Status
validated

## Post Type
Guide

## Technologies Covered
- Go
- IPv6
- HTTP client transport configuration
- TCP connection testing
- Concurrency
- `sync/atomic`

## Sources Consulted
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `net` package documentation: https://pkg.go.dev/net
- Go `sync/atomic` package documentation: https://pkg.go.dev/sync/atomic
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html

## Issues Found
- The HTTP load tester created a deadline context for the overall run, but individual requests were not bound to that context. I changed the example to use `http.NewRequestWithContext` with `client.Do` so the configured duration now controls request cancellation as documented by `net/http`.
- The HTTP load tester closed response bodies without draining them first. I updated the example to discard the response body before closing it so persistent HTTP connections can be reused correctly, matching `net/http` client behavior.
- The TCP connection tester printed `connected` and `failed` with non-atomic reads and returned without waiting for in-flight goroutines. I added a `sync.WaitGroup`, switched the loop to a semaphore-backed `select`, and loaded the counters atomically before reporting results so the totals are not racy or incomplete.
- The section titled `Latency Histogram` did not produce a histogram. I corrected the section title and helper name to `Latency Statistics`.
- The P50 calculation used a different indexing method than the P95 and P99 calculations. I changed P50 to use the same percentile calculation style for consistency.
- The conclusion described `sync/atomic` as providing lock-free counters. I corrected that wording to atomic operations, which is what the official documentation guarantees.

## Review Notes
- `2001:db8::/32` is the correct documentation-only IPv6 prefix for examples per RFC 3849.
- If this transport is later adapted for HTTPS benchmarking, note that providing a custom `DialContext` changes HTTP/2 behavior unless the transport is configured accordingly; this is documented in `net/http`.
- Local compilation was not possible in this workspace because the `go` command is not installed.
