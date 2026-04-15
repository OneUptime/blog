# Validation Summary: How to Create Custom Middleware in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (sidecar architecture, middleware pipeline)
- Go (net/http, reverse proxy, JSON marshaling)
- components-contrib middleware interface
- HTTP reverse proxy pattern

## Sources Consulted
- Dapr components-contrib middleware interface: https://github.com/dapr/components-contrib/blob/main/middleware/middleware.go
- Dapr HTTP middleware package: https://pkg.go.dev/github.com/dapr/dapr/pkg/middleware/http
- Dapr middleware development guide: https://docs.dapr.io/developing-applications/develop-components/develop-middleware/
- Dapr cmd/daprd source structure: https://github.com/dapr/dapr/tree/master/cmd/daprd
- Go net/http package documentation: https://pkg.go.dev/net/http
- Go httputil.ReverseProxy documentation: https://pkg.go.dev/net/http/httputil

## Issues Found

1. **Introduction incorrectly called middleware "Go plugins"**: Dapr middleware components are not Go plugins (which refers to Go's `plugin` package). Changed "Go plugins that implement the `middleware.Middleware` interface" to "implement the `Middleware` interface from the `components-contrib` package."

2. **Middleware Interface section showed non-existent `MiddlewareFunc` type**: The post showed `type MiddlewareFunc func(next http.Handler) http.Handler` as the Dapr middleware interface. This type does not exist in Dapr. The actual interface from `github.com/dapr/components-contrib/middleware` requires implementing `GetHandler(ctx context.Context, metadata Metadata) (func(next http.Handler) http.Handler, error)`. Replaced with the correct interface definition.

3. **`AuditLog.Duration` JSON tag mismatch**: The `Duration` field had JSON tag `duration_ms` implying a numeric milliseconds value, but the actual value was `time.Since(start).String()` which produces a human-readable string like "1.234ms" or "2.345s". Changed the tag to `duration` to match the string value.

4. **main.go had multiple critical errors**:
   - Import `github.com/dapr/dapr/cmd/daprd/main_windows` does not exist — there is no such exported package in the Dapr repository.
   - `mh.NewRegistry()` does not exist in `github.com/dapr/dapr/pkg/middleware/http`.
   - `mh.MiddlewareFunc` type does not exist in Dapr.
   - `daprd.Start()` was used but `daprd` was never imported and this function does not exist.
   - Missing `net/http` import despite using `http.Handler`.
   - Rewrote the section to properly implement the `Middleware` interface from `components-contrib` via a wrapper struct with `GetHandler`, and added a note about the custom daprd build process with a link to official docs.

## Review Notes
- The reverse proxy pattern (proxy/main.go) is technically correct and is a practical alternative to building a custom Dapr binary.
- The `HeaderInjectionMiddleware` example uses an undefined `generateID()` function. This is acceptable as a code snippet showing the pattern, but readers may benefit from a note that this is a placeholder.
- The `dapr run` command section backgrounds the process with `&` which is workable but slightly unusual — typically you'd run each in separate terminals. This is a style choice, not a bug.
- Dapr also supports WebAssembly-based middleware as a way to extend the middleware pipeline without rebuilding the sidecar binary. This could be mentioned as an additional alternative in a future update.
