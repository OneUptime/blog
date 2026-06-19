# Validation Summary: How to Configure gRPC Load Balancing

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- gRPC and HTTP/2
- gRPC-Go client-side load balancing
- gRPC custom name resolvers and custom balancers
- Envoy proxy
- NGINX gRPC proxying
- Kubernetes headless Services and gRPC probes
- Istio DestinationRule and VirtualService
- gRPC health checking

## Sources Consulted
- gRPC-Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go load balancing example: https://github.com/grpc/grpc-go/blob/master/examples/features/load_balancing/client/main.go
- gRPC custom name resolution guide: https://grpc.io/docs/guides/custom-name-resolution/
- gRPC service config guide: https://grpc.io/docs/guides/service-config/
- gRPC health checking guide: https://grpc.io/docs/guides/health-checking/
- gRPC load balancing overview: https://grpc.io/blog/grpc-load-balancing/
- Envoy route match API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy upstream HTTP protocol options reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- NGINX gRPC module documentation: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- NGINX upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Kubernetes liveness, readiness, and startup probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/

## Issues Found
- The Go client examples used deprecated `grpc.Dial`; changed them to `grpc.NewClient`, which is the current gRPC-Go client constructor.
- The custom resolver example used deprecated `grpc.WithInsecure`; changed it to `grpc.WithTransportCredentials(insecure.NewCredentials())`.
- The round-robin service configs used the older `loadBalancingPolicy` field; changed them to `loadBalancingConfig`, matching current gRPC-Go examples.
- The first Go snippet imported `google.golang.org/grpc/resolver` without using it; removed the unused import.
- The custom resolver snippet did not actually attach weights for the later weighted balancer example; added resolver address attributes for the weight value.
- The weighted balancer snippet had unused imports and fields, performed weighted random selection despite being named weighted round-robin, and used an unsafe type assertion for weight attributes; updated it to a simple weighted round-robin picker with guarded attribute handling.
- The Envoy cluster example used the deprecated direct `http2_protocol_options` cluster field; replaced it with the current `typed_extension_protocol_options` form for upstream HTTP/2.
- The Kubernetes gRPC probes did not specify the `service` name even though the health server example reports status for `myservice`; added `service: myservice` to both readiness and liveness probes.
- The Istio examples used `networking.istio.io/v1alpha3`; updated them to the current `networking.istio.io/v1` API version shown in Istio's reference documentation.

## Review Notes
The Go examples remain illustrative because they depend on application-specific generated protobufs and placeholder types such as `ServiceDiscovery`, `NewConsulDiscovery`, `myServiceServer`, `db`, and `cache`. The technical APIs and configuration fields used by the examples were checked against current official documentation.
