# Validation Summary: How to Trace Goroutine Execution with runtime/trace in Go

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- Go (Golang)
- `runtime/trace` standard library package
- `net/http/pprof` standard library package
- `go tool trace` CLI tool
- `go test -trace` CLI flag
- Go runtime scheduler / goroutines / channels / sync.WaitGroup

## Sources Consulted
- Go standard library docs: https://pkg.go.dev/runtime/trace
- Go standard library docs: https://pkg.go.dev/net/http/pprof
- Go cmd docs: https://pkg.go.dev/cmd/trace
- Go cmd docs: https://pkg.go.dev/cmd/go#hdr-Testing_flags (for `-trace` flag)
- Go execution tracer design / Chrome catapult trace-viewer keybindings (W/A/S/D)
- Go blog on the execution tracer

## Issues Found
No technical issues found.

API signatures verified:
- `trace.Start(w io.Writer) error` — correct
- `trace.Stop()` — correct
- `trace.NewTask(pctx context.Context, taskType string) (context.Context, *Task)` — correct
- `(*Task).End()` — correct
- `trace.WithRegion(ctx context.Context, regionType string, fn func())` — correct
- `trace.Log(ctx context.Context, category, message string)` — correct (3 args: ctx, category, message)

CLI / runtime claims verified:
- `go test -trace=<file>` flag exists and writes trace output as described
- `go tool trace <file>` opens a local web server with the documented analysis views (View trace, Goroutine analysis, network/sync/syscall blocking profiles, scheduler latency profile)
- `_ "net/http/pprof"` registers `/debug/pprof/trace` which accepts a `seconds` query parameter
- Trace viewer navigation keys (W/S to zoom, A/D to pan) match Chrome's catapult trace-viewer used by `go tool trace`
- Goroutine waiting reasons listed (`chan receive`, `chan send`, `select`, `sync.Mutex`, `sync.Cond`, `IO wait`, sleep) align with runtime wait reason strings

Conceptual claims verified:
- Tracing captures discrete scheduler events (vs. CPU profiling's sampling) — correct
- Runtime events tracked (goroutine create/destroy, block/unblock, syscalls, GC phases, netpoll) — correct
- Trace overhead is higher than CPU profiling and traces are typically run for seconds — correct
- "Runnable" state high time indicates CPU contention — correct
- `runtime.GOMAXPROCS` limits P count and creates scheduler latency under many CPU-bound goroutines — correct

## Review Notes
- The deadlock example will trigger Go's "all goroutines are asleep — deadlock!" runtime panic and the deferred `trace.Stop()` / `f.Close()` will not run normally. The trace file may be incomplete in practice. The example still illustrates the conceptual pattern of blocked workers/main, so this is acceptable as a teaching example but readers attempting to reproduce it should be aware they may need to introduce a timeout or modify the example to actually inspect a useful trace.
- The fixed worker-pool example does not wait for the result-collector goroutine before main returns. In practice, since `wg.Wait()` blocks until workers finish (which only happens after `jobs` is fully drained, which only happens after the collector has read all results that workers sent), this works correctly in this particular case — but adding a second WaitGroup or done channel for the collector would be a more robust pattern. Not a bug worth fixing in the post.
- "Usually on port 0, check the output" for `go tool trace` is technically accurate (port 0 means "let the kernel assign one") but readers may find this wording confusing — they will see a real port number printed. Minor wording observation, not a technical error.
- "Heap allocations (when enabled)" in the bullet list is a slight simplification of how heap-related events are tracked in modern Go traces (heap goal/size sampling rather than per-allocation events in recent versions), but is broadly accurate enough as a high-level summary.
- The post does not specify a minimum Go version. All APIs described (`NewTask`, `WithRegion`, `Log`) have been stable since Go 1.11 (2018), so the content applies to all currently supported Go releases.
