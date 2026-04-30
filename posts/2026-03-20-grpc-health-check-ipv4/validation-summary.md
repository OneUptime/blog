# Validation Summary: How to Configure gRPC Health Checking over IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- gRPC health checking protocol (`grpc.health.v1`)
- Python gRPC (`grpcio-health-checking`)
- Go gRPC (`google.golang.org/grpc/health`)
- Kubernetes liveness and readiness probes
- `grpc_health_probe`

## Sources Consulted
- gRPC Health Checking guide: https://grpc.io/docs/guides/health-checking/
- Canonical health protocol definition: https://github.com/grpc/grpc-proto/blob/master/grpc/health/v1/health.proto
- gRPC Python health-checking API docs: https://grpc.github.io/grpc/python/grpc_health_checking.html
- Go `health` package docs: https://pkg.go.dev/google.golang.org/grpc/health
- Go `grpc_health_v1` package docs: https://pkg.go.dev/google.golang.org/grpc/health/grpc_health_v1
- `grpc_health_probe` project documentation: https://github.com/grpc-ecosystem/grpc-health-probe
- Kubernetes probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/

## Issues Found
- The protocol snippet was outdated. The canonical `grpc.health.v1.Health` service now includes `List`, so I added `rpc List(HealthListRequest) returns (HealthListResponse);`.
- The `SERVICE_UNKNOWN` enum entry was missing its official constraint. I updated it to note that it is used only by the `Watch` method, matching the canonical proto comments.
- The Kubernetes exec probe used `/bin/grpc_health_probe` while the installation example placed the binary in `/usr/local/bin/grpc_health_probe`. I made the probe commands use `/usr/local/bin/grpc_health_probe` so the instructions are internally consistent.
- The conclusion used Go-specific method naming (`SetServingStatus`) even though the Python example uses `set()`. I replaced that wording with API-neutral language about updating the serving status.

## Review Notes
- The Python and Go code examples are otherwise technically sound for current gRPC libraries and correctly use the standard health service registration and status-setting APIs.
- Kubernetes has native `grpc:` probes in current releases (`v1.27` and later). The post's `grpc_health_probe`-based exec probes are still valid, especially for older clusters or when you need probe features such as TLS-related flags that built-in probes do not support.
- The GitHub Releases `latest/download` URL for `grpc_health_probe-linux-amd64` resolved successfully during review on 2026-04-30, but version-pinned download URLs would be more reproducible over time.
- This review was performed against current official and authoritative documentation; the sample Python, Go, and Kubernetes snippets were not executed in this workspace.
