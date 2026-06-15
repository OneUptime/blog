# Validation Summary: How to Gracefully Cancel Long-Running Goroutines with Context in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Goroutines
- `context` package
- Channel cancellation patterns
- `sync.WaitGroup`
- File I/O cleanup with `defer`

## Sources Consulted
- Go `context` package documentation: https://pkg.go.dev/context
- Go blog, "Go Concurrency Patterns: Context": https://go.dev/blog/context
- Effective Go: https://go.dev/doc/effective_go
- Author GitHub profile link: https://github.com/nawazdhandala

## Issues Found
- The basic cancellation example called `cancel()` and then slept for only 100 ms even though each worker could be blocked in a 500 ms `time.Sleep`. This meant the program could print `Done` and exit before workers observed cancellation, which undercut the stated graceful cleanup behavior. Updated the example to use `sync.WaitGroup` and a cancellation-aware `select` with `time.After`, then wait for all workers with `wg.Wait()`.

## Review Notes
The Go examples were reviewed against the official `context` documentation for cancellation propagation, deadline behavior, `CancelFunc` resource cleanup, `ctx.Done()`, `ctx.Err()`, and context value guidance. The local environment did not have the `go` binary installed, so examples could not be compiled with `go run`; syntax and API usage were reviewed manually against official documentation.
