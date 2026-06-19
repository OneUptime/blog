# Validation Summary: How to Fix 'Unavailable' Status Errors in gRPC

## Status
validated

## Post Type
Troubleshooting guide / technical tutorial

## Technologies Covered
- gRPC status codes and health checking
- grpc-go client and server APIs
- Go retry interceptors
- NGINX gRPC proxy configuration
- Envoy gRPC routing, retries, and health checks
- grpcurl diagnostics
- Linux networking and service log commands

## Sources Consulted
- gRPC status codes documentation: https://grpc.io/docs/guides/status-codes/
- gRPC health checking documentation: https://grpc.io/docs/guides/health-checking/
- grpc-go package documentation: https://pkg.go.dev/google.golang.org/grpc
- grpc-go health package documentation: https://pkg.go.dev/google.golang.org/grpc/health
- NGINX ngx_http_grpc_module documentation: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- Envoy router retry documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter
- Envoy route RetryPolicy API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy cluster API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto
- Envoy upstream HTTP protocol options API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- grpcurl README: https://github.com/fullstorydev/grpcurl

## Issues Found
- The first Go server snippet imported `context` without using it. Removed the unused import.
- The health check example only set status for `myservice`, while the diagnostic command also checks the empty service name. Added serving and shutdown statuses for `""`, which the gRPC health checking documentation defines as the whole-server health key.
- The client snippets used deprecated `grpc.Dial`, `grpc.DialContext`, and `grpc.WithBlock`. Updated them to `grpc.NewClient` and added explicit readiness checks with `Connect` and `WaitForStateChange` where the post needs a connection timeout.
- The retry snippet used `insecure.NewCredentials()` but did not import `google.golang.org/grpc/credentials/insecure`. Added the missing import.
- The server-side configuration snippet imported unused packages. Removed the unused imports.
- The NGINX snippet described `error_page` handling as retry behavior. Added `grpc_next_upstream` and `grpc_next_upstream_tries` for upstream retry/selection, enabled `grpc_intercept_errors`, and clarified that `error_page` maps HTTP gateway errors to gRPC `UNAVAILABLE`.
- The NGINX snippet used the older `listen 443 ssl http2` form. Updated it to `listen 443 ssl;` plus `http2 on;`, matching current NGINX examples.
- The Envoy cluster snippet used direct `http2_protocol_options`, which current Envoy docs mark as deprecated in favor of upstream HTTP protocol options under `typed_extension_protocol_options`. Updated the snippet accordingly and added typed config for the router filter.

## Review Notes
The Go snippets are illustrative and still depend on generated `myservice/proto` types. I could not run Go compilation or grpcurl locally because `go` and `grpcurl` are not installed in this environment, so validation was performed against official documentation and API references.
