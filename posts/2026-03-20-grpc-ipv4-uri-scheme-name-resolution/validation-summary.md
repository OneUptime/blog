# Validation Summary: How to Use the ipv4 URI Scheme in gRPC Name Resolution

## Status
validated

## Post Type
Guide

## Technologies Covered
- gRPC
- gRPC name resolution
- gRPC service config
- gRPC health checking
- Go (`grpc-go`)
- Python (`grpcio`)
- IPv4 networking

## Sources Consulted
- gRPC name resolution spec: https://github.com/grpc/grpc/blob/master/doc/naming.md
- gRPC Custom Name Resolution guide: https://grpc.io/docs/guides/custom-name-resolution/
- grpc-go package docs (`grpc.NewClient`): https://pkg.go.dev/google.golang.org/grpc
- grpc-go resolver package docs: https://pkg.go.dev/google.golang.org/grpc/resolver
- grpc-go round_robin balancer docs: https://pkg.go.dev/google.golang.org/grpc/balancer/roundrobin
- grpc-go name resolving example: https://github.com/grpc/grpc-go/tree/master/examples/features/name_resolving
- gRPC Python API docs (`grpc.insecure_channel` / `grpc.secure_channel`): https://grpc.github.io/grpc/python/grpc.html
- gRPC Service Config guide: https://grpc.io/docs/guides/service-config/
- gRPC Health Checking guide: https://grpc.io/docs/guides/health-checking/
- gRPC Core channel arg names (`grpc.lb_policy_name`, `grpc.service_config`): https://grpc.github.io/grpc/core/channel__arg__names_8h.html

## Issues Found
- The post used `ipv4:///...` target strings. The gRPC naming spec defines the IPv4 syntax as `ipv4:address[:port][,address[:port],...]`, so I corrected the Python examples and the post text to use `ipv4:...`.
- The post claimed Go could use a built-in `ipv4` resolver. `grpc-go` does not register an `ipv4` resolver; its built-in direct-address option is `passthrough`, and multi-address resolution requires a custom resolver. I corrected the Go sections to use `passthrough:///host:port` for a single address and the existing `static` resolver pattern for multiple backends.
- The Go examples used deprecated `grpc.Dial`. I updated them to `grpc.NewClient`, which is the current API in `grpc-go` 1.x.
- The Go round-robin example imported `google.golang.org/grpc/balancer/roundrobin` unnecessarily. Current `grpc-go` installs `round_robin` as a default balancer, so I removed that pattern and used the service config directly.
- The Go service config used the legacy `loadBalancingPolicy` field. I updated it to the current `loadBalancingConfig` form used in gRPC service-config documentation.
- The Python single-address example enabled `round_robin` and DNS re-resolution options on an `ipv4:` target. With a single backend there is nothing to balance, and `ipv4:` bypasses DNS, so I removed those misleading options.

## Review Notes
- Python support for `ipv4:` is based on gRPC Core naming syntax and the Python API passing the target string through to gRPC Core; the official Python API docs document the channel API but do not include a dedicated `ipv4:` example.
- The custom static resolver example remains valid as a minimal grpc-go resolver example, but in production a resolver that watches for updates and handles `UpdateState` errors is usually more appropriate.
