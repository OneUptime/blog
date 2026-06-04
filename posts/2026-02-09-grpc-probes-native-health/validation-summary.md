# Validation Summary: How to Configure gRPC Probes for Native gRPC Health Protocol Support

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes liveness, readiness, and startup probes
- Native Kubernetes gRPC probes
- gRPC Health Checking Protocol
- Go gRPC health server
- Python grpcio-health-checking
- Node.js grpc-health-check and @grpc/grpc-js
- grpc_health_probe CLI
- Prometheus / kubelet probe metrics

## Sources Consulted
- Kubernetes documentation: Liveness, Readiness, and Startup Probes - https://kubernetes.io/docs/concepts/workloads/pods/probes/
- Kubernetes task guide: Configure Liveness, Readiness and Startup Probes - https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Kubernetes blog: Kubernetes 1.24: gRPC container probes in beta - https://kubernetes.io/blog/2022/05/13/grpc-probes-now-in-beta/
- Kubernetes Metrics Reference - https://kubernetes.io/docs/reference/instrumentation/metrics/
- gRPC Health Checking guide - https://grpc.io/docs/guides/health-checking/
- gRPC Health Checking Protocol definition - https://github.com/grpc/grpc/blob/master/doc/health-checking.md
- gRPC Python health checking API - https://grpc.github.io/grpc/python/grpc_health_checking.html
- gRPC Node grpc-health-check README/source - https://github.com/grpc/grpc-node/tree/master/packages/grpc-health-check
- Go gRPC health package documentation - https://pkg.go.dev/google.golang.org/grpc/health
- grpc-health-probe package documentation - https://pkg.go.dev/github.com/grpc-ecosystem/grpc-health-probe

## Issues Found
- Corrected the Kubernetes version claim. The post said Kubernetes 1.24 introduced native gRPC health checks; Kubernetes 1.23 introduced alpha support, 1.24 made it beta and enabled by default, and 1.27 made it stable.
- Removed an unused Go import and added placeholder dependency-check functions so the Go example is syntactically consistent.
- Added placeholder dependency-check functions to the Python example so the example matches the calls it makes.
- Corrected the Node.js package and API from `@grpc/health-check` / `Implementation` / `servingStatus` to the official `grpc-health-check` package with `HealthImplementation`, string serving statuses, and `addToServer`.
- Removed the deprecated `server.start()` call from the Node.js example after `bindAsync`.
- Rewrote the TLS section. Native Kubernetes gRPC probes do not support TLS or authentication parameters and do not automatically detect TLS; the post now recommends a separate plaintext health port or an exec probe with TLS-capable tooling.
- Updated the `grpc_health_probe` installation command from an old pinned release download to `go install github.com/grpc-ecosystem/grpc-health-probe@latest`.
- Fixed the HTTP bridge snippet to call `healthServer.Check(...)` instead of the nonexistent `GetServingStatus` method, and passed the health server into the function.
- Corrected the Prometheus examples. Kubelet `prober_probe_*` metrics use `probe_type` values such as `Readiness`, not `GRPC`, and successful probe results are labeled `successful`, not `success`.

## Review Notes
The examples remain illustrative and still assume generated application-specific gRPC service stubs such as `my_service_pb2_grpc` or `your/package/proto`. Kubernetes gRPC probes require numeric ports and do not support custom hostnames; the post's examples use numeric probe ports correctly.
