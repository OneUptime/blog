# Validation Summary: How to Profile Go Applications with pprof

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Go
- runtime/pprof
- net/http/pprof
- go tool pprof
- CPU, heap, goroutine, block, mutex, and execution trace profiling

## Sources Consulted
- Go net/http/pprof package documentation: https://pkg.go.dev/net/http/pprof
- Go runtime package documentation: https://pkg.go.dev/runtime
- Go runtime/pprof package documentation: https://pkg.go.dev/runtime/pprof
- Google pprof documentation: https://github.com/google/pprof/blob/main/doc/README.md
- Go Diagnostics documentation: https://go.dev/doc/diagnostics
- Go Blog: Profiling Go Programs: https://go.dev/blog/pprof

## Issues Found
- The programmatic profiling example deferred `pprof.StopCPUProfile`, so the CPU profile would include the later heap profiling work rather than only the intended application work. I changed it to stop CPU profiling immediately after `doWork()`.
- The programmatic heap profile example allocated 100 MB inside `doWork()` and then forced GC after `doWork()` returned, so that allocation could be reclaimed before the heap profile. I changed `doWork()` to return the allocation and used `runtime.KeepAlive(data)` after writing the heap profile so the example can demonstrate live heap usage.
- The memory analysis command `(pprof) alloc_space` was not a valid pprof interactive command as written. I changed it to `(pprof) sample_index=alloc_space`, which is the pprof option for switching to cumulative allocated bytes.
- The goroutine cleanup example used `r.Context()` with `defer cancel()` in a handler that returned immediately, which would cancel the worker almost immediately rather than giving it the documented bounded lifetime. I changed the example to create a bounded background context and release timer resources inside the worker goroutine.
- The flame graph explanation said the x-axis represents stack depth. I corrected it to say the y-axis represents stack depth and width represents time spent.
- The block profiling sampling comment described `runtime.SetBlockProfileRate(100)` as sampling 1% of events. Go documents block profile sampling as roughly one blocking event per `rate` nanoseconds spent blocked, so I corrected the comment.

## Review Notes
The local environment did not have the `go` binary installed, so I could not compile the snippets locally. I reviewed the code and commands against the official Go and pprof documentation instead. The post is technically relevant and validated after the targeted corrections above.
