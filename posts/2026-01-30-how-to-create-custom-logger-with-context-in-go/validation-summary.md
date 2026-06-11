# Validation Summary: How to Create Custom Logger with Context in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- `context.Context`
- `log/slog`
- `net/http` middleware
- `github.com/google/uuid`
- Structured logging and request correlation

## Sources Consulted
- Go `log/slog` package documentation: https://pkg.go.dev/log/slog
- Go `context` package documentation: https://pkg.go.dev/context
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- `github.com/google/uuid` package documentation: https://pkg.go.dev/github.com/google/uuid

## Issues Found
- The custom `InfoCtx`, `ErrorCtx`, and `DebugCtx` methods accepted a `context.Context` but called `slog.Logger.Info`, `slog.Logger.Error`, and `slog.Logger.Debug`. This added the request fields manually, but did not pass the context through to the underlying slog handler. Updated those methods to call `InfoContext`, `ErrorContext`, and `DebugContext`, which are the context-aware logging methods provided by `log/slog`.

## Review Notes
The tutorial's use of a package-private custom context key type follows Go's guidance to avoid context key collisions. The examples are illustrative and use placeholder import paths such as `yourproject/logger`, which readers must replace with their module path.
