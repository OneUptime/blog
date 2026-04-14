# Validation Summary: How to Use Dapr Profiling for CPU and Memory Debugging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar runtime, `daprd`)
- Go pprof (CPU, heap, and goroutine profiling)
- Kubernetes (annotations, port-forwarding)
- Dapr CLI (`dapr run`)
- Grafana Pyroscope (continuous profiling)
- Docker

## Sources Consulted
- Dapr Profiling & Debugging documentation — https://docs.dapr.io/operations/troubleshooting/profiling-debugging/
- Dapr arguments and annotations overview — https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr CLI reference (`dapr run`) — https://docs.dapr.io/reference/cli/dapr-run/
- Go `net/http/pprof` package documentation — https://pkg.go.dev/net/http/pprof
- Go blog on pprof — https://go.dev/blog/pprof
- Grafana Pyroscope documentation — https://grafana.com/docs/pyroscope/latest/

## Issues Found

1. **Invalid Kubernetes annotation `dapr.io/profiling-port`**: The post included `dapr.io/profiling-port: "7777"` as a Kubernetes annotation. This annotation does not exist in the Dapr sidecar injector. The profiling port defaults to 7777 and can only be changed via the `--profile-port` flag on `daprd`, not via annotation. Removed the annotation line and added a clarifying note about the default port and how to change it.

2. **Pyroscope ingestion curl command missing required parameters**: The original command `curl -X POST http://pyroscope:4040/ingest --data-binary @cpu.prof -H "Content-Type: application/octet-stream"` was missing the required `name` and `format` query parameters for the Pyroscope `/ingest` endpoint. Updated to include `?name=dapr-sidecar&format=pprof` and removed the unnecessary Content-Type header.

## Review Notes
- The Pyroscope integration section demonstrates a manual push approach using curl, which works for ad-hoc profiling but is not the recommended method for continuous production profiling. In production, Grafana Alloy or the Pyroscope SDK would be more appropriate for automated continuous profiling. The post's approach is still valid for the demonstrated use case.
- All Go pprof commands (`top10`, `top10 -cum`, `list`, `web`, `-http` flag) are correct and current.
- The `debug=2` parameter on the goroutine endpoint is correct and produces the most detailed human-readable goroutine dump.
- The default Dapr profiling port of 7777 is correctly used throughout the post.
- The troubleshooting table references (`pubsub.Process`, `state.Set`, `grpc.Recv`) are illustrative examples rather than exact function names from the Dapr codebase, which is acceptable for a guide of this nature.
