# Validation Summary: How to Avoid Common Goroutine Leaks in Go

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Go
- Goroutines
- Channels
- context
- sync.WaitGroup and sync.Mutex
- runtime.NumGoroutine
- runtime/pprof and net/http/pprof
- go.uber.org/goleak
- golang.org/x/sync/errgroup

## Sources Consulted
- Go FAQ on goroutine stack overhead: https://go.dev/doc/faq
- Go language specification for channels: https://go.dev/ref/spec
- context package documentation: https://pkg.go.dev/context
- runtime package documentation: https://pkg.go.dev/runtime
- runtime/pprof package documentation: https://pkg.go.dev/runtime/pprof
- net/http/pprof package documentation: https://pkg.go.dev/net/http/pprof
- Go modules dependency management documentation: https://go.dev/doc/modules/managing-dependencies
- go.uber.org/goleak package documentation: https://pkg.go.dev/go.uber.org/goleak
- golang.org/x/sync/errgroup package documentation: https://pkg.go.dev/golang.org/x/sync/errgroup

## Issues Found
- The pprof example imported `time` but did not use it, which would prevent the snippet from compiling. Removed the unused import.
- The resource cleanup example said to use `defer` in reverse order of acquisition, while the code correctly placed the defer calls in acquisition order so they execute in reverse order. Updated the comment to accurately describe Go's LIFO defer behavior.
- The `FetchData` context example returned on context cancellation but its simulated request goroutine did not observe cancellation. Updated the goroutine to select on `ctx.Done()` so it can exit promptly.
- The timeout wrapper example could still leak its worker goroutine if the wrapped work blocked forever. Updated the wrapper to pass a context into the work function and changed the examples so the work observes cancellation.

## Review Notes
Go is not installed in this workspace, so snippets could not be compiled locally with `go test` or `go run`. The review was performed against official Go documentation and package documentation. The worker pool example is acceptable as a lifecycle-management demonstration, but a future production version should guard against concurrent `Submit` calls during shutdown and define whether shutdown drains or cancels queued work.
