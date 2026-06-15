# Validation Summary: How to Migrate Traffic Between Service Versions in Go

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Go
- net/http
- net/http/httputil reverse proxies
- sync/atomic
- hash/fnv
- Feature flags
- Canary deployments and weighted traffic routing
- OpenTelemetry

## Sources Consulted
- Go `net/http/httputil` package documentation: https://pkg.go.dev/net/http/httputil
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `net/url` package documentation: https://pkg.go.dev/net/url
- Go `math/rand` package documentation: https://pkg.go.dev/math/rand
- Go `sync/atomic` package documentation: https://pkg.go.dev/sync/atomic
- Go `hash/fnv` package documentation: https://pkg.go.dev/hash/fnv
- Go `sync` package documentation: https://pkg.go.dev/sync
- Go `fmt` package documentation: https://pkg.go.dev/fmt
- OpenTelemetry Go documentation: https://opentelemetry.io/docs/languages/go/

## Issues Found
- The feature-flag router called `ffr.hashToBucket(userID)` but did not define that method or import `hash/fnv`. Added the missing import and a `hashToBucket` method matching the sticky-session example's deterministic bucket logic.
- The health-aware router used `httputil.ReverseProxy` and `rand.Intn` but did not import `net/http/httputil` or `math/rand`. Added the missing imports so the snippet is syntactically correct.
- The final `main` example used `fmt.Fprintf`, `http.HandleFunc`, and `strconv.Atoi` without showing the required package and imports. Added `package main` and the missing imports.

## Review Notes
- The standard-library APIs used in the post are current and not deprecated. The `sync/atomic` documentation now recommends typed atomic values such as `atomic.Int64` as a more ergonomic option, but the function-based `LoadInt64`, `StoreInt64`, `LoadInt32`, and `StoreInt32` calls used in the post remain valid.
- `httputil.NewSingleHostReverseProxy` remains available, but the official documentation notes that it does not rewrite the `Host` header. That is acceptable for the examples, though production deployments may need explicit host-header handling depending on backend expectations.
- The admin endpoint is intentionally minimal for the tutorial. In production it should be authenticated, validate weight bounds, and handle parsing and server errors explicitly.
