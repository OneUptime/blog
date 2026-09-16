# Validation Summary: gRPC Client Stays on a Dead Kubernetes Pod: Fix DNS Re-Resolution, Resolver Schemes, and Channel State

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- gRPC-Go
- Go TLS
- Kubernetes Services and headless Services
- Kubernetes DNS and EndpointSlices
- HTTP/2 connections
- gRPC name resolution, load balancing, keepalive, and channel connectivity states

## Sources Consulted

- Kubernetes, DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes, Services: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes, EndpointSlices: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes, Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- gRPC-Go package documentation: https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go, Anti-Patterns of Client Creation: https://github.com/grpc/grpc-go/blob/master/Documentation/anti-patterns.md
- gRPC-Go DNS resolver implementation: https://github.com/grpc/grpc-go/blob/master/internal/resolver/dns/dns_resolver.go
- gRPC name resolution specification: https://github.com/grpc/grpc/blob/master/doc/naming.md
- gRPC service configuration specification: https://github.com/grpc/grpc/blob/master/doc/service_config.md
- gRPC connectivity semantics and API: https://grpc.github.io/grpc/core/md_doc_connectivity-semantics-and-api.html
- gRPC keepalive guide: https://grpc.io/docs/guides/keepalive/
- Local `kubectl get --help` output for command and flag validation

## Issues Found

- The resolver-target explanation described an empty URI authority as selecting the configured resolver. The URI scheme selects the resolver; for the DNS scheme, an empty authority means the default DNS server. Corrected the explanation.
- The description of `grpc.NewClient` omitted that an application can override its default resolver scheme. Added this qualification while preserving the recommendation to use an explicit `dns:///` target.

## Review Notes

- `grpc.NewClient` was introduced in gRPC-Go v1.63.0, so the example requires that version or newer.
- `grpc.Dial` is deprecated but remains supported throughout gRPC-Go 1.x; the post correctly recommends `grpc.NewClient`.
- The 30-second DNS minimum resolution interval is an implementation detail confirmed in the inspected current source, not a polling guarantee; the post states this distinction correctly.
