# Validation Summary: How to Debug Custom Dapr Components

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pluggable components, sidecar, metadata API)
- Go (structured logging, gRPC server implementation)
- gRPC (interceptors, Unix domain sockets)
- grpcurl and grpc_cli (socket inspection tools)
- Kubernetes (Dapr sidecar annotations)

## Sources Consulted
- [Dapr state store proto definition (state.proto)](https://github.com/dapr/dapr/blob/master/dapr/proto/components/v1/state.proto) — verified Go import path `github.com/dapr/dapr/pkg/proto/components/v1`, type names `StateStoreServer`, `GetRequest` (with `Key` field), `GetResponse` (with `Data` field)
- [Dapr kit/logger on pkg.go.dev](https://pkg.go.dev/github.com/dapr/kit/logger) — verified `Logger` interface with `Debugf` and `Errorf` methods
- [Dapr pluggable components registration docs](https://docs.dapr.io/operations/components/pluggable-components-registration/) — verified default Unix socket directory `/tmp/dapr-components-sockets/`
- [Dapr metadata API reference](https://docs.dapr.io/reference/api/metadata_api/) — verified `/v1.0/metadata` endpoint, `components` and `appConnectionProperties` response fields
- [Dapr arguments and annotations overview](https://docs.dapr.io/reference/arguments-annotations-overview/) — verified `dapr.io/log-level` and `dapr.io/enable-profiling` annotations
- [Dapr profiling & debugging docs](https://docs.dapr.io/operations/troubleshooting/profiling-debugging/)
- [grpcurl GitHub repository (fullstorydev/grpcurl)](https://github.com/fullstorydev/grpcurl) — verified `-unix` flag syntax and `-plaintext` requirement
- [grpc_cli Unix socket support (gRPC tools)](https://github.com/fullstorydev/grpcurl/pull/26/files) — verified `unix:` scheme prefix requirement

## Issues Found
1. **Unused `"fmt"` import in first Go code block (line 24):** The `fmt` package was imported but never used in the `DebugableStore` code. In Go, unused imports are compile errors. **Fix:** Removed the `"fmt"` import line.

2. **Incorrect `grpc_cli` Unix socket syntax (line 91):** The command `grpc_cli ls /tmp/dapr-components-sockets/my-store.sock` used a bare file path. `grpc_cli` requires the `unix:` scheme prefix for Unix domain socket targets. **Fix:** Changed to `grpc_cli ls unix:/tmp/dapr-components-sockets/my-store.sock`.

3. **Missing `-plaintext` flag in `grpcurl` command (line 94):** The command `grpcurl -unix /tmp/dapr-components-sockets/my-store.sock list` was missing the `-plaintext` flag. Without it, grpcurl defaults to TLS, which will fail for Dapr pluggable component Unix sockets that use plaintext gRPC. **Fix:** Changed to `grpcurl -plaintext -unix /tmp/dapr-components-sockets/my-store.sock list`.

## Review Notes
- The Go code examples are illustrative snippets (not full runnable programs), which is appropriate for a blog post. The gRPC interceptor snippet references `logger` and `log` variables without full initialization context, but this is clear enough in tutorial form.
- The `dapr.io/enable-profiling` annotation in the Kubernetes YAML is valid but tangential to debugging pluggable components specifically — it enables pprof profiling on the sidecar. This is not incorrect, just a broader debugging tool than the post's main focus.
- All Dapr API endpoints, CLI flags, and Kubernetes annotations are current as of Dapr 1.13+/1.14+.
