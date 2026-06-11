# Validation Summary: How to Create Custom Error Types with Stack Traces in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go error handling
- Go standard library `errors` package
- Go standard library `fmt.Errorf` error wrapping with `%w`
- Go standard library `log/slog`
- `github.com/pkg/errors`

## Sources Consulted
- Go standard library `errors` package documentation: https://pkg.go.dev/errors
- Go standard library `fmt` package documentation for `fmt.Errorf` and `%w`: https://pkg.go.dev/fmt
- Go blog, "Working with Errors in Go 1.13": https://go.dev/blog/go1.13-errors
- `github.com/pkg/errors` package documentation: https://pkg.go.dev/github.com/pkg/errors

## Issues Found
- The post said `github.com/pkg/errors` was largely superseded by standard library features. This was imprecise because the standard library added wrapping and inspection APIs, but not stack trace capture. Updated the wording to clarify that `pkg/errors` is in maintenance mode after Go 1.13 wrapping changes and remains useful for stack traces.
- The `pkg/errors` examples imported the package as `errors`, which made later examples using the standard library `errors.Is` and `errors.As` ambiguous. Updated those examples to alias `github.com/pkg/errors` as `pkgerrors`.
- The custom `AppError` constructor called `pkg/errors.New` and then wrapped that error again with `WithStack`, capturing an extra stack trace. Updated it to use the stack trace already recorded by `pkgerrors.New`, matching the package documentation that `New` records a stack trace.
- The `errors.Is` / `errors.As` example assigned the two return values from `fetchUser` to a single variable. Updated it to use `_, err := fetchUser("123")` and added a nil check.
- The `errors.Is` example implied a sentinel match without making clear that the returned error must be or wrap the sentinel. Added a brief comment clarifying this requirement.
- The structured logging snippet used `errors.As` and `fmt.Sprintf` but only imported `log/slog`. Updated the import block to include `errors` and `fmt`.
- The best practice "Always implement Unwrap" was too broad. Updated it to recommend implementing `Unwrap` when a custom error intentionally wraps an underlying error, consistent with Go's guidance that wrapping exposes that error as part of the API.

## Review Notes
The post remains technically relevant. The main caveat is that `github.com/pkg/errors` is in maintenance mode; the post now states that clearly while preserving its focus on stack traces.
