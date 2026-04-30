# Validation Summary: How to Handle IPv6 in gRPC Load Balancing

## Status
validated

## Post Type
Guide

## Technologies Covered
- gRPC
- gRPC-Go
- gRPC Python
- Kubernetes Services
- Envoy Proxy
- Nginx
- grpcurl
- IPv6
- HTTP/2

## Sources Consulted
- gRPC Service Config: https://grpc.io/docs/guides/service-config/
- gRPC Custom Load Balancing Policies: https://grpc.io/docs/guides/custom-load-balancing/
- gRPC Custom Name Resolution: https://grpc.io/docs/guides/custom-name-resolution/
- gRPC Health Checking: https://grpc.io/docs/guides/health-checking/
- gRPC-Go package docs (`NewClient`, `WithDefaultServiceConfig`): https://pkg.go.dev/google.golang.org/grpc
- gRPC Python channel docs: https://grpc.github.io/grpc/python/grpc.html
- gRPC Core channel argument names (`grpc.service_config`): https://grpc.github.io/grpc/cpp/channel__arg__names_8h.html
- gRPC Health Checking Protocol: https://grpc.github.io/grpc/cpp/md_doc_health-checking.html
- Kubernetes Services and Headless Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes IPv4/IPv6 dual-stack Services: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Envoy cluster API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/cluster/v3/cluster.proto.html
- Envoy upstream HTTP protocol options: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/upstreams/http/v3/http_protocol_options.proto
- Envoy route components API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Nginx gRPC module: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- Nginx HTTP/2 module: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx 1.25.1 announcement (`listen ... http2` deprecation): https://mailman.nginx.org/pipermail/nginx-announce/2023/BYSVLPUZESCZHJMTDD25QD7ZKZYADAR2.html
- grpcurl README / invocation docs: https://github.com/fullstorydev/grpcurl
- RFC 3849 IPv6 documentation prefix: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The Go snippets did not compile as written. They imported `roundrobin` twice, omitted the `credentials/insecure` import that the code actually uses, and used the older `loadBalancingPolicy` JSON form. I removed the unused import, added the correct `insecure` import, and switched the service config to the current `loadBalancingConfig` form documented by gRPC.
- The Python snippet used `grpc.enable_http_proxy` under a comment claiming it "Force[s] IPv6 resolution", which is incorrect. Per gRPC Core docs, that argument disables HTTP proxy usage; it does not force AAAA resolution. I replaced the example with a direct `grpc.service_config` round-robin configuration.
- The Kubernetes headless Service example implied that `ipFamilies` and `ipFamilyPolicy` were how IPv6 headless DNS behavior is enabled. For headless Services with selectors, Kubernetes DNS returns pod A or AAAA records directly based on the backing endpoints. I removed the misleading dual-stack fields and corrected the comments.
- The Envoy cluster used the deprecated top-level `http2_protocol_options` field. Current Envoy docs direct upstream HTTP protocol configuration through `typed_extension_protocol_options` with `envoy.extensions.upstreams.http.v3.HttpProtocolOptions`. I updated the snippet accordingly.
- Several IPv6 literals were invalid. Addresses such as `2001:db8:backend::1` are not syntactically valid IPv6 because `backend` is not hexadecimal. I replaced them with valid documentation-prefix examples from `2001:db8::/32`.
- The Nginx example used `listen [::]:50051 http2;`, which is deprecated in current Nginx. I updated it to `listen [::]:50051;` plus `http2 on;`.
- The `grpcurl` example omitted a request body for the unary health check and did not mention descriptor requirements. I changed it to `-d '{}'` and noted that `grpcurl` needs server reflection or local proto/protoset files.

## Review Notes
- `grpc.NewClient()` is current in grpc-go; `grpc.Dial()` is deprecated in the current package docs.
- The updated Nginx `http2 on;` syntax is the current form for Nginx 1.25.1 and later. Older Nginx deployments may still accept `listen ... http2`.
- The article’s main architectural claim is correct: client-side load balancing or an L7 proxy is needed if you want distribution beyond a single long-lived HTTP/2 connection.
