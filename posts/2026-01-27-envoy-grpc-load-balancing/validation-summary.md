# Validation Summary: How to Use Envoy for gRPC Load Balancing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Envoy Proxy
- gRPC
- HTTP/2
- gRPC health checking protocol
- Go grpc-go health check service APIs
- Kubernetes Deployments, Services, ConfigMaps, and probes
- Prometheus scraping for Envoy metrics
- grpcurl

## Sources Consulted
- Envoy HTTP connection manager v3 API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto
- Envoy upstream HTTP protocol options v3 API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy health check v3 API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto
- Envoy route components v3 API documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy health checking architecture documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/health_checking
- Envoy version history / supported versions: https://www.envoyproxy.io/docs/envoy/latest/version_history/version_history
- Envoy Docker image documentation: https://hub.docker.com/r/envoyproxy/envoy
- gRPC health checking protocol documentation: https://github.com/grpc/grpc/blob/master/doc/health-checking.md
- grpc-go health package documentation: https://pkg.go.dev/google.golang.org/grpc/health
- grpc-go generated health service API documentation: https://pkg.go.dev/google.golang.org/grpc/health/grpc_health_v1
- Kubernetes container environment variable documentation: https://kubernetes.io/docs/tasks/inject-data-application/define-environment-variable-container/

## Issues Found
- The Go health-check example imported `google.golang.org/grpc/health` but did not use it, which would cause a Go compile error. Removed the unused import.
- The custom Go health-check server returned `SERVING` for unregistered service names. The gRPC health checking protocol requires `Check` to fail with gRPC status `NOT_FOUND` for unknown services. Updated the code to return `status.Error(codes.NotFound, "unknown service")`.
- The custom Go health-check server did not embed `healthpb.UnimplementedHealthServer`, even though current grpc-go generated service docs recommend embedding it for forward compatibility. Added the embedded field.
- The example `Watch` implementation returned `nil` without sending a health status, which is misleading for a registered streaming health RPC. Removed the incomplete override so the embedded unimplemented server handles unsupported `Watch` calls correctly.
- The production Envoy example set `request_timeout: 60s` in the HTTP connection manager. Envoy documents that this timeout is not compatible with streaming requests, so the broad gRPC example now disables it with `request_timeout: 0s` while retaining route-level unary RPC timeouts.
- The Kubernetes manifest used `envoyproxy/envoy:v1.28-latest`, which is no longer a supported Envoy minor as of June 12, 2026. Updated it to `envoyproxy/envoy:v1.38-latest`, matching the currently supported latest stable minor.

## Review Notes
- Go is not installed in this workspace, so the Go sample could not be compiled locally. The corrected API usage was checked against the official grpc-go package documentation.
- Docker is available and the `envoyproxy/envoy:v1.38-latest` image is present locally, but the post primarily contains partial snippets; validation focused on field names, API shape, and documented behavior.
- The route-level `timeout` examples are appropriate for unary RPCs. For long-lived streaming RPCs, readers should set route timeouts intentionally, often disabling the route timeout or using stream idle controls instead.
