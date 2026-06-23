# Validation Summary: How to Load Balance gRPC Traffic in Kubernetes Without a Service Mesh

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- gRPC (Go and Python clients)
- Kubernetes (headless Services, Deployments, gRPC readiness probes)
- HTTP/2
- Envoy proxy (sidecar L7 load balancing, v3 API)
- CoreDNS-based client-side load balancing
- Lookaside load balancing (gRPC resolver API)
- Prometheus / Grafana (PromQL) for monitoring

## Sources Consulted
- gRPC Go documentation and `google.golang.org/grpc` API reference (https://pkg.go.dev/google.golang.org/grpc)
- gRPC name resolution / `dns:///` scheme and load balancing docs (https://github.com/grpc/grpc/blob/master/doc/naming.md, https://github.com/grpc/grpc/blob/master/doc/load-balancing.md)
- gRPC service config / `loadBalancingPolicy` (round_robin, pick_first, grpclb) reference
- gRPC keepalive guide (https://github.com/grpc/grpc/blob/master/doc/keepalive.md)
- Envoy v3 API: HttpConnectionManager, HttpProtocolOptions (`typed_extension_protocol_options`), clusters, circuit breakers, outlier detection, gRPC health checks (https://www.envoyproxy.io/docs/envoy/latest/api-v3/api)
- Kubernetes Services (headless / `clusterIP: None`) and gRPC liveness/readiness probes (GA in 1.27) (https://kubernetes.io/docs/concepts/services-networking/service/, https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/)
- Python gRPC channel arguments / `grpc.insecure_channel` options (https://grpc.github.io/grpc/python/)

## Issues Found
1. **Go client (`client/client.go`) — unused import.** The import block included `"os"`, which is never referenced. In Go an unused import is a compile error (`imported and not used: "os"`). Removed the `"os"` import.
2. **Connection pool (`pool/connection_pool.go`) — missing and unused imports.** The code calls `keepalive.ClientParameters{...}` but the `google.golang.org/grpc/keepalive` package was not imported (undefined `keepalive`), while `"context"` was imported but never used (unused-import compile error). Removed `"context"` and added `"google.golang.org/grpc/keepalive"` so the snippet compiles.

## Review Notes
- **`grpc.Dial` deprecation (not changed):** Recent grpc-go releases (v1.63+) deprecate `grpc.Dial`/`grpc.DialContext` in favor of `grpc.NewClient`. The code as written still compiles and works correctly, and `grpc.NewClient` has slightly different connection semantics (lazy connect, no `WithBlock`), so the examples were left as-is. A future refresh could migrate to `grpc.NewClient`.
- **Python `from concurrent import futures` (not changed):** Imported but unused in the client snippet. Unused imports are not errors in Python (only a lint warning), so it was left untouched.
- **Connection pool locking (informational):** `healthCheck()` launches `go p.reconnect(i)` while holding `p.mu.RLock()`; `reconnect` then takes `p.mu.Lock()`. Because it runs in a separate goroutine it does not deadlock (it blocks until the read lock is released), but it is a subtle concurrency pattern. Not a correctness bug for the illustrative purpose of the post.
- The Envoy configurations correctly use the v3 `typed_extension_protocol_options` / `HttpProtocolOptions` form (the modern replacement for the deprecated inline `http2_protocol_options` on clusters), and the load-balancing policy names, circuit breaker, and outlier detection fields match the Envoy v3 API.
- The conceptual explanation of why L4 load balancing distributes connections (not requests) for HTTP/2-multiplexed gRPC traffic is accurate.
