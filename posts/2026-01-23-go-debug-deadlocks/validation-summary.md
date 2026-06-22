# Validation Summary: How to Debug Deadlocks in Go Concurrency

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- Go
- Goroutines
- Channels
- sync.Mutex
- sync.WaitGroup
- context timeouts
- Go race detector
- net/http/pprof and runtime/pprof
- os/signal
- github.com/sasha-s/go-deadlock

## Sources Consulted
- Go language specification: channel types, send statements, close, select statements: https://go.dev/ref/spec
- Go runtime source for deadlock fatal error: https://go.dev/src/runtime/proc.go
- Go data race detector documentation: https://go.dev/doc/articles/race_detector
- sync package documentation for Mutex and WaitGroup: https://pkg.go.dev/sync
- net/http/pprof package documentation: https://pkg.go.dev/net/http/pprof
- runtime/pprof package documentation for goroutine profile output: https://pkg.go.dev/runtime/pprof
- context package documentation for WithTimeout and Done: https://pkg.go.dev/context
- os/signal package documentation for Notify and SIGUSR1 handling: https://pkg.go.dev/os/signal
- sasha-s/go-deadlock project documentation: https://github.com/sasha-s/go-deadlock

## Issues Found
- Pattern 1 and Pattern 2 used `fmt.Println` in complete `package main` examples without importing `fmt`. Added `import "fmt"` to both snippets so they are syntactically complete.
- The mutex lock-ordering deadlock example was scheduler-dependent because either goroutine could acquire both locks before the other started. Added `time.Sleep(100 * time.Millisecond)` after each first lock and imported `time` so the example reliably demonstrates opposing lock acquisition.
- The self-deadlock fix claimed `RWMutex` could solve recursive locking. Go's `sync.Mutex` and `sync.RWMutex` are not reentrant locks, so the fix was narrowed to restructuring the code.
- The `-race` section appeared under deadlock detection without clarifying scope. Added a sentence explaining that the race detector catches data races, not deadlocks directly.
- The pprof section title implied pprof detects deadlocks. Renamed it to "Deadlock Investigation with pprof" because pprof exposes goroutine/profile data for diagnosis rather than automatically detecting deadlocks.
- The `go-deadlock` snippet implied warnings occur simply when another goroutine is stuck waiting. Updated the comment to say the library warns when it detects a potential mutex deadlock.

## Review Notes
The local environment did not have the Go toolchain installed, so snippets were reviewed against official Go documentation rather than compiled locally. The post is technically relevant and remains a valid Go concurrency debugging guide after the focused corrections above.
