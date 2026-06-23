# Validation Summary: How to Build REST APIs in Go with Chi

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Chi router v5
- Go net/http
- Chi middleware
- REST API routing and handlers
- Go httptest
- Go net/http/pprof

## Sources Consulted
- Chi package documentation: https://pkg.go.dev/github.com/go-chi/chi/v5
- Chi middleware documentation: https://pkg.go.dev/github.com/go-chi/chi/v5/middleware
- Chi GitHub repository and README: https://github.com/go-chi/chi
- Go net/http documentation: https://pkg.go.dev/net/http
- Go net/http/pprof documentation: https://pkg.go.dev/net/http/pprof

## Issues Found
- The post used `middleware.RealIP`, which is deprecated in current Chi v5.3.0 middleware documentation due to IP spoofing concerns. Replaced it with `middleware.ClientIPFromRemoteAddr` and adjusted the explanatory comment to point readers toward the appropriate `ClientIPFrom*` middleware for their deployment topology.
- The complete REST API applied `BookCtx` with `r.Use(h.BookCtx)` before the nested `{bookID}` route parameter was available. This caused `TestGetBookNotFound` to panic because the middleware did not load the book context before the handler asserted it. Moved `r.Use(h.BookCtx)` inside the `r.Route("/{bookID}", ...)` block so Chi has the route parameter available before the middleware runs.

## Review Notes
- Verified the Go code blocks by compiling them in a Go 1.24 Docker container with `github.com/go-chi/chi/v5` v5.3.0.
- Verified the included test examples by running them against the complete API example; all tests passed after the route middleware fix.
- The local host did not have `go` installed, so Docker was used for compilation and test verification.
