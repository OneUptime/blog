# Validation Summary: How to Configure gRPC Health Checking

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC health checking protocol
- Go gRPC
- Python gRPC
- Kubernetes liveness, readiness, and startup probes
- grpc-health-probe
- Envoy Proxy
- NGINX Plus
- Prometheus metrics

## Sources Consulted
- gRPC Health Checking guide: https://grpc.io/docs/guides/health-checking/
- gRPC Health Checking Protocol: https://github.com/grpc/grpc/blob/master/doc/health-checking.md
- Go gRPC health package documentation: https://pkg.go.dev/google.golang.org/grpc/health
- Python gRPC health checking documentation: https://grpc.github.io/grpc/python/grpc_health_checking.html
- Kubernetes liveness, readiness, and startup probes documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- grpc-health-probe README: https://github.com/grpc-ecosystem/grpc-health-probe
- Envoy health check API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto
- NGINX Plus gRPC health checks documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/grpc-health-check/
- NGINX upstream health check directive reference: https://nginx.org/en/docs/http/ngx_http_upstream_hc_module.html

## Issues Found
- Corrected the `SERVICE_UNKNOWN` protocol comment to state that it is used only by the `Watch` method, matching the official gRPC health checking protocol.
- Updated the Python custom health servicer so unary `Check` aborts with `NOT_FOUND` for unknown services instead of returning `SERVICE_UNKNOWN`, which is only valid for `Watch`.
- Changed the Python health servicer base class to `health.HealthServicer` and simplified the status type annotation to avoid relying on a generated enum type attribute that is not part of the documented Python API.
- Replaced Go `grpc.Dial` examples with `grpc.NewClient`, because `Dial` is deprecated in current grpc-go documentation.
- Removed an unused `context` import from the graceful shutdown Go example so the snippet compiles.
- Updated the Kubernetes section to avoid implying that native gRPC probes are the same as `grpc-health-probe`; current Kubernetes documents native gRPC probes as stable in v1.27.
- Revised the `grpc-health-probe` section heading and note because the tool is still relevant for older Kubernetes versions and advanced options, while native probes are now stable.
- Updated the Dockerfile probe download to use the current documented versioned binary pattern with `TARGETOS` and `TARGETARCH`.
- Changed the NGINX Plus example from accepting `UNIMPLEMENTED` (`grpc_status=12`) to checking the named gRPC health service with `grpc_service`, because the post's upstream service implements the gRPC Health Checking Protocol.

## Review Notes
The test snippets assume a compatible gRPC server is already running on `localhost:50051`; they are integration-style examples rather than self-contained unit tests. The Kubernetes native gRPC probe example uses numeric ports, which is required because Kubernetes gRPC probes do not support named ports.
