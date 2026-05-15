# Validation Summary: How to Configure Envoy for gRPC Load Balancing on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Red Hat Enterprise Linux 9
- Envoy Proxy
- gRPC
- HTTP/2
- grpcurl
- YAML configuration

## Sources Consulted
- Envoy HTTP connection manager v3 API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto
- Envoy HTTP route components v3 API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy router filter retry documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter
- Envoy HTTP upstream protocol options v3 API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy health check v3 API: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto
- gRPC official documentation: https://grpc.io/docs/
- grpcurl official repository usage documentation: https://github.com/fullstorydev/grpcurl

## Issues Found
- The Envoy `health_checks` example omitted the required `unhealthy_threshold` and `healthy_threshold` fields. Added `unhealthy_threshold: 2` and `healthy_threshold: 1` so the active gRPC health check block matches Envoy's required health-check schema.

## Review Notes
- The Envoy listener, route, retry policy, upstream HTTP/2 protocol option, STRICT_DNS cluster, ROUND_ROBIN load balancing policy, and gRPC health-check type are consistent with current Envoy v3 configuration documentation.
- The grpcurl commands use valid syntax for plaintext gRPC calls. The `list` command depends on server reflection unless proto descriptors are supplied.
