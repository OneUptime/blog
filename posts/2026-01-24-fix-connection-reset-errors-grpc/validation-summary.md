# Validation Summary: How to Fix 'Connection Reset' Errors in gRPC

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- gRPC and HTTP/2
- grpc-go
- Python grpcio
- AWS Application Load Balancer
- Terraform AWS provider
- NGINX gRPC proxying
- Envoy Proxy
- grpcurl, OpenSSL, netcat, tcpdump

## Sources Consulted
- gRPC keepalive guide: https://grpc.io/docs/guides/keepalive/
- grpc-go keepalive package documentation: https://pkg.go.dev/google.golang.org/grpc/keepalive
- grpc-go package documentation: https://pkg.go.dev/google.golang.org/grpc
- grpc-go retry example documentation: https://pkg.go.dev/google.golang.org/grpc/examples/features/retry
- gRPC retry guide: https://grpc.io/docs/guides/retry/
- gRPC core channel argument keys: https://grpc.github.io/grpc/core/group__grpc__arg__keys.html
- NGINX ngx_http_grpc_module documentation: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- Envoy HTTP/2 protocol options documentation: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/protocol.proto
- AWS Application Load Balancer attributes documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html
- AWS Application Load Balancer target group health check documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/target-group-health-checks.html
- Terraform AWS provider `aws_lb_target_group` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lb_target_group

## Issues Found
- The Go client examples used `grpc.Dial`. Current grpc-go documentation uses `grpc.NewClient` for new client connections. Updated the keepalive client, manual retry client, and built-in retry examples.
- The built-in retry Go example called `log.Fatalf` without importing `log`. Added the missing import.
- The health-check server example imported `context` without using it, and the client health-check example imported `credentials/insecure` without using it. Removed the unused imports so the snippets are syntactically correct.
- The gRPC debug logging snippet used `os.Stdout` and `os.Stderr` without importing `os`. Added the missing import.
- The load balancer section implied that keepalive PINGs below the idle timeout keep an AWS ALB connection active. AWS documents that Application Load Balancers do not support HTTP/2 PING frames for resetting the idle timeout. Updated the explanation and diagram text to recommend setting the idle timeout for expected idle periods or sending application data.
- The Terraform ALB snippet placed an idle-timeout comment above target group stickiness. Updated the comment so it describes stickiness, and kept the idle timeout guidance on the load balancer resource.
- The Envoy snippet configured downstream HTTP/2 options but omitted routing, the router HTTP filter, load assignment, and upstream HTTP/2 configuration needed for a usable gRPC proxy. Added the minimal route configuration, router filter, static endpoint, and `http2_protocol_options` on the cluster.

## Review Notes
The Go service implementation types such as `myService`, `pb.Request`, and `pb.Response` remain illustrative placeholders. The retry examples are technically valid, but production retry policies should be limited to idempotent or otherwise safe RPCs.
