# Validation Summary: How to Design Custom Error Types with Stack Traces in Go

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Go
- Go error handling
- Go runtime stack inspection
- Go structured logging with log/slog

## Sources Consulted
- Go runtime package documentation: https://pkg.go.dev/runtime
- Go errors package documentation: https://pkg.go.dev/errors
- Go log/slog package documentation: https://pkg.go.dev/log/slog

## Issues Found
- The `processOrder` snippet declared `order` but did not use it, which would cause a Go compile error. Changed it to `_` because the example only needs to check the returned error.
- The practical example's stack trace showed `main.chargeCard` first, but `StackTrace()` is called on the outer error returned by `errors.Wrap` in `processPayment`. With the shown implementation, the wrapper captures the stack at the wrapping point, so the displayed sample now starts at `main.processPayment`.
- The performance section said `runtime.Callers` allocates memory. The documented API fills a caller-provided `[]uintptr`; in the post's implementation, the slice allocation happens in user code and frame resolution is the additional work. Reworded that sentence accordingly.
- The implementation section described all shown methods as "standard interfaces," but `StackTrace` is a custom helper and `Unwrap` is Go's error wrapping convention. Reworded this to be precise.

## Review Notes
The snippets are illustrative rather than a single complete package. The lazy frame resolution example references `resolveFrames` without defining it, which is acceptable for the focused performance pattern but would need implementation in production code.
