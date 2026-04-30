# Validation Summary: How to Implement gRPC Load Balancing with IPv4 Endpoints

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- gRPC
- gRPC-Go
- gRPC Python
- gRPC service config and name resolution
- Nginx gRPC proxying
- Kubernetes Services and headless Services
- Envoy
- HTTP/2

## Sources Consulted
- gRPC Go basics tutorial: https://grpc.io/docs/languages/go/basics/
- gRPC service config guide: https://grpc.io/docs/guides/service-config/
- gRPC custom load balancing guide: https://grpc.io/docs/guides/custom-load-balancing/
- gRPC custom name resolution guide: https://grpc.io/docs/guides/custom-name-resolution/
- grpc-go anti-patterns (`grpc.NewClient` guidance): https://github.com/grpc/grpc-go/blob/master/Documentation/anti-patterns.md
- grpc-go load balancing example: https://github.com/grpc/grpc-go/blob/master/examples/features/load_balancing/client/main.go
- gRPC Python API docs (`grpc.insecure_channel`): https://grpc.github.io/grpc/python/grpc.html#grpc.insecure_channel
- gRPC Python load-balancing example: https://github.com/grpc/grpc/blob/master/examples/python/lb_policies/greeter_client.py
- gRPC core channel argument names (`grpc.lb_policy_name`, `grpc.service_config`): https://github.com/grpc/grpc/blob/master/include/grpc/impl/channel_arg_names.h
- Kubernetes Service and headless Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- NGINX gRPC module documentation: https://nginx.org/en/docs/http/ngx_http_grpc_module.html
- NGINX upstream module documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- NGINX 1.25.1 change note on the new `http2` directive and `listen ... http2` deprecation: https://mailman.nginx.org/pipermail/nginx/2023-June/HKMIKLBDMF2EDYNVMZWERI3LMF4VAGO2.html

## Issues Found
- The Go example imported `google.golang.org/grpc/balancer/roundrobin` and `google.golang.org/grpc/resolver` without using them, which would make the snippet fail to compile. I removed the unused imports.
- The Go example used the older `loadBalancingPolicy` service-config field. Current gRPC documentation and the official grpc-go load-balancing example use `loadBalancingConfig`, so I updated the snippet to `{"loadBalancingConfig": [{"round_robin":{}}]}`.
- The Go section comments said the snippet used a static IP-list resolver even though the target string was `dns:///...`. I corrected the comments to describe DNS-based discovery and `round_robin` behavior accurately.
- The NGINX snippet enabled HTTP/2 with `listen 50051 http2;`. Current NGINX documentation uses `http2 on;`, and NGINX 1.25.1 deprecated the `listen ... http2` parameter. I updated the snippet to current syntax and clarified that gRPC proxying itself is available starting in NGINX 1.13.10.
- The headless-Service explanation and conclusion overstated how TCP-level and Kubernetes `ClusterIP` load balancing interact with gRPC. I revised the wording to match gRPC and Kubernetes behavior: `round_robin` rotates RPCs across resolved addresses, while connection-oriented load balancers spread TCP connections but do not perform per-RPC balancing within a long-lived HTTP/2 connection.

## Review Notes
- The Python example is still technically valid. The `grpc.lb_policy_name` channel option remains an official gRPC core channel argument, and the upstream Python load-balancing example still uses it.
- The updated NGINX snippet now reflects current syntax. Readers running NGINX versions before 1.25.1 but after 1.13.10 would need the older `listen ... http2` form instead.
- Local checks: `validation.json` was validated with `jq`, and the embedded Python snippet was checked for syntax with `python3`. Runtime validation of the Go snippet, NGINX config, DNS behavior, and Kubernetes manifests was not possible in this workspace because `go` and `nginx` are not installed and no live Kubernetes cluster is available.
