# Validation Summary: How to Build a Priority-Based Request Queue in Go

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- `container/heap`
- `sync.Mutex`
- `sync.Cond`
- Goroutines
- Channels
- `net/http`
- `encoding/json`
- `sync/atomic`
- `github.com/google/uuid`

## Sources Consulted
- Go `container/heap` package documentation: https://pkg.go.dev/container/heap
- Go `sync` package documentation, including `Cond`: https://pkg.go.dev/sync
- Go `sync/atomic` package documentation: https://pkg.go.dev/sync/atomic
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `encoding/json` package documentation: https://pkg.go.dev/encoding/json
- `github.com/google/uuid` package documentation: https://pkg.go.dev/github.com/google/uuid

## Issues Found
- The description said the queue was built with channels, but the queue implementation uses `sync.Mutex` and `sync.Cond`; channels are only used for worker completion. Changed the description to reference synchronization primitives and goroutines.
- The heap explanation said parents always have higher priority than children. Go's `container/heap` defines ordering according to the `Less` method and `heap.Pop` removes the minimum according to `Less`. Clarified that the code makes higher-priority requests sort first by defining `Less` accordingly.
- The post said FIFO ordering within the same priority prevents starvation caused by high-priority requests jumping ahead of low-priority requests. That is incorrect; FIFO only applies within the same priority level. Changed the explanation to state that lower-priority requests can still starve.
- The metrics snippet referenced `q.metrics` on `Queue`, but the earlier `Queue` type had no `metrics` field. Changed the snippet to use an `InstrumentedQueue` wrapper containing both the queue and metrics.

## Review Notes
The main queue and worker-pool examples use current Go APIs and match the documented behavior of `container/heap`, `sync.Cond`, `net/http`, `encoding/json`, `sync/atomic`, and `github.com/google/uuid`. Local compilation was not run because the `go` command is not installed in this workspace.
