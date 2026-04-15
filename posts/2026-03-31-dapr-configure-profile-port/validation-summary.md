# Validation Summary: How to Configure Dapr Profile Port

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar runtime, Kubernetes annotations, CLI)
- Go pprof (CPU profiling, heap profiling, goroutine analysis, execution tracing)
- Kubernetes (Deployments, annotations, NetworkPolicy, kubectl port-forward)

## Sources Consulted
- Dapr runtime source code (`pkg/runtime/config.go` — confirms `DefaultProfilePort = 7777`)
- Dapr sidecar injector annotations source (`pkg/injector/annotations/annotations.go` — confirms `dapr.io/enable-profiling` exists but `dapr.io/profile-port` does not)
- Dapr CLI source code (`cmd/run.go` — confirms `--profile-port` and `--enable-profiling` flags)
- Dapr daprd options source (`cmd/daprd/options/options.go` — confirms `--profile-port` flag with default 7777, no annotation tag)
- Dapr official documentation: profiling and debugging guide (https://docs.dapr.io/operations/troubleshooting/profiling-debugging/)
- Dapr CLI reference: `dapr run` (https://docs.dapr.io/reference/cli/dapr-run/)
- Go standard library `net/http/pprof` documentation (https://pkg.go.dev/net/http/pprof)

## Issues Found
1. **Non-existent `dapr.io/profile-port` annotation**: The post used `dapr.io/profile-port: "7777"` as a Kubernetes annotation in the deployment YAML and in the "Changing the Profile Port" section. This annotation does not exist in Dapr's codebase. The profile port is only configurable via the `--profile-port` flag on the `daprd` binary, not via a Kubernetes pod annotation. Removed the annotation from the deployment example, added a note that the profile port defaults to 7777 and is not annotation-configurable, and rewrote the "Changing the Profile Port" section to show the correct `daprd --profile-port` flag usage.

## Review Notes
- All pprof endpoint paths (`/debug/pprof/profile`, `/debug/pprof/heap`, `/debug/pprof/allocs`, `/debug/pprof/goroutine`, `/debug/pprof/trace`) are correct — these are standard Go `net/http/pprof` endpoints.
- The `dapr run` CLI flags (`--profile-port`, `--enable-profiling`) are correct.
- The `dapr.io/enable-profiling` annotation is correct and verified in the Dapr source.
- The default profile port of 7777 is correct and verified in the Dapr runtime source.
- The NetworkPolicy example is structurally correct YAML, though the port number should be updated if the user changes the profile port.
- The security guidance (don't expose externally, use port-forward, enable temporarily) is sound advice.
