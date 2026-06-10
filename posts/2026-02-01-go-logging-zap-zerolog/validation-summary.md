# Validation Summary: How to Use Logging with Zap and Zerolog in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go (Golang)
- Uber's Zap logging library (`go.uber.org/zap`, `go.uber.org/zap/zapcore`)
- Zerolog logging library (`github.com/rs/zerolog`, `github.com/rs/zerolog/log`)
- OpenTelemetry trace API (`go.opentelemetry.io/otel/trace`)
- Go `context` package (request-scoped logging)
- Go `net/http` middleware pattern
- `github.com/google/uuid`

## Sources Consulted
- Zap official docs and source: https://pkg.go.dev/go.uber.org/zap and https://github.com/uber-go/zap
- Zap `zapcore` package reference: https://pkg.go.dev/go.uber.org/zap/zapcore (verified `EncoderConfig` fields, `NewJSONEncoder`, `AddSync`, `NewCore`, `LowercaseLevelEncoder`, `ISO8601TimeEncoder`, `MillisDurationEncoder`, `ShortCallerEncoder`)
- Zap `NewProduction` behavior (writes JSON to stderr, samples, includes timestamps): https://pkg.go.dev/go.uber.org/zap#NewProduction
- Sugared logger `Infow`/`Infof` semantics: https://pkg.go.dev/go.uber.org/zap#SugaredLogger
- Zerolog README and GoDoc: https://github.com/rs/zerolog and https://pkg.go.dev/github.com/rs/zerolog
- Zerolog `ConsoleWriter` and `TimeFieldFormat`/`SetGlobalLevel` API: https://pkg.go.dev/github.com/rs/zerolog#ConsoleWriter
- Zerolog log levels (Trace, Debug, Info, Warn, Error, Fatal, Panic): https://pkg.go.dev/github.com/rs/zerolog#Level
- OpenTelemetry Go `trace` package (`SpanFromContext`, `SpanContext().IsValid()`, `TraceID()`, `SpanID()`): https://pkg.go.dev/go.opentelemetry.io/otel/trace
- Google UUID: https://pkg.go.dev/github.com/google/uuid

## Issues Found
1. **Missing `"time"` import in the "Pretty Printing for Development" Zerolog example.** The code referenced `time.Millisecond` for the `Dur()` call but only imported `"os"` and `"github.com/rs/zerolog"`. Added `"time"` to the import block so the snippet compiles as written.
2. **Missing `"github.com/rs/zerolog/log"` import in the "Integrating with OpenTelemetry" example.** The `ProcessOrder` function referenced `log.Logger` (the package-level global from zerolog's `log` subpackage), but the import block did not include it. Added the import so the snippet is consistent with the function body.

## Review Notes
- The Zap `EncoderConfig` example only specifies a subset of available fields; newer versions of zapcore have added optional fields (e.g., `SkipLineEnding`, `NewReflectedEncoder`, `ConsoleSeparator`). The shown fields are all still valid and the snippet works correctly because the omitted fields have safe zero values. No change needed.
- `defer logger.Sync()` for Zap is shown unconditionally. On stdout/stderr, `Sync` can return a benign error (e.g., `sync /dev/stderr: invalid argument`) on some platforms. This is a common simplification in Zap tutorials and matches Zap's own README example, so the post does not need to change.
- Performance numbers in the comparison table are presented explicitly as "general observations from community benchmarks" and are within the right order of magnitude; left as-is.
- The author's installation command `go get -u github.com/rs/zerolog/log` pulls both the `zerolog` and `zerolog/log` packages into the module cache, so it is fine, though `go get -u github.com/rs/zerolog` would also have worked.
- The OpenTelemetry snippet declares `package main` without a `main()`. This is illustrative-only, typical for tutorial snippets, and not a technical error.
