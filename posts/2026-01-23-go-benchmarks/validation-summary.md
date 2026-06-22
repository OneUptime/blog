# Validation Summary: How to Write Benchmarks in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Go testing package benchmarks
- go test benchmark flags
- sync, sync/atomic, and sync.RWMutex
- strings.Builder
- benchstat

## Sources Consulted
- Go testing package documentation: https://pkg.go.dev/testing
- Go command documentation and test flags: https://pkg.go.dev/cmd/go
- Go sync/atomic package documentation: https://pkg.go.dev/sync/atomic
- benchstat command documentation: https://pkg.go.dev/golang.org/x/perf/cmd/benchstat

## Issues Found
- The basic `BenchmarkSum` example discarded the result of `Sum(numbers)`. With `b.N`-style benchmarks, pure work whose result is unused can be optimized away. Added a package-level `sumResult` sink and assigned the benchmark result to it.
- The memory allocation benchmark examples assigned results to the blank identifier. Changed them to assign to a package-level `stringResult` sink so the string-building work is kept observable.
- The table-driven hash benchmark discarded the digest returned by `Sum(nil)`. Added a package-level `hashResult` sink and assigned the digest to it.
- The benchmark output explanation described the `-8` suffix as the number of CPU cores used. Corrected it to the GOMAXPROCS value used for the benchmark.
- The manual `runtime.GOMAXPROCS` sub-benchmark changed process-global state without restoring it. Added `b.Cleanup` to restore the previous GOMAXPROCS value after each sub-benchmark.

## Review Notes
- The `b.N` benchmark style is still valid, but current Go documentation says new benchmarks should prefer `b.Loop()` where available because it manages timing more automatically and keeps loop-body calls and assigned values alive. The post remains technically correct after the targeted fixes above.
- I could not run `go test` locally because the `go` toolchain is not installed in this container.
