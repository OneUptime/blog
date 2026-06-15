# Validation Summary: How to Build a Layer 7 Load Balancer with Health Checks in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- net/http
- net/http/httputil reverse proxy
- sync and sync/atomic concurrency primitives
- HTTP health checks
- Load balancing algorithms

## Sources Consulted
- Go package documentation for net/http: https://pkg.go.dev/net/http
- Go package documentation for net/http/httputil: https://pkg.go.dev/net/http/httputil
- Go package documentation for sync/atomic: https://pkg.go.dev/sync/atomic
- Go package documentation for flag: https://pkg.go.dev/flag

## Issues Found
- The least-connections algorithm registered backend counters but did not increment or decrement them while serving requests. As written, all counters would remain at zero and the algorithm would repeatedly select the first healthy backend. Updated `ServeHTTP` to increment the selected backend's counter before proxying and defer decrementing it until the proxied request completes.

## Review Notes
- The Go toolchain was not installed in the review environment, so I could not run `go test`, `go build`, or the sample `go run` commands locally. The code was reviewed against the official Go package documentation instead.
- `httputil.NewSingleHostReverseProxy` is still available, but the official docs note that it uses the older `Director` mechanism internally for backward compatibility. For a future hardening pass, consider using a custom `ReverseProxy` with `Rewrite` if the example needs stricter control of forwarded headers.
