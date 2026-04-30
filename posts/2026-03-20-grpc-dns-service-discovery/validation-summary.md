# Validation Summary: How to Set Up gRPC Service Discovery Using IPv4 DNS

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- gRPC
- gRPC-Go
- gRPC Python
- DNS-based service discovery
- IPv4 DNS A records
- Kubernetes Services
- Kubernetes headless Services

## Sources Consulted
- gRPC Service Config guide: https://grpc.io/docs/guides/service-config/
- gRPC Wait-for-Ready guide: https://grpc.io/docs/guides/wait-for-ready/
- gRPC Retry guide: https://grpc.io/docs/guides/retry/
- gRPC-Go API reference (`NewClient`, `WithDefaultServiceConfig`): https://pkg.go.dev/google.golang.org/grpc
- gRPC-Go load balancing example: https://pkg.go.dev/google.golang.org/grpc/examples/features/load_balancing
- gRPC Core service config reference: https://grpc.github.io/grpc/core/md_doc_service_config.html
- gRPC Core channel argument reference (`grpc.service_config`, `grpc.lb_policy_name`): https://grpc.github.io/grpc/core/channel__arg__names_8h.html
- gRPC naming reference: https://github.com/grpc/grpc/blob/master/doc/naming.md
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- RFC 1035, Domain Names - Implementation and Specification: https://www.rfc-editor.org/rfc/rfc1035
- Local CLI help and invocation checks: `dig -h`, `nslookup localhost`

## Issues Found
- The DNS diagram and explanation implied that A records include port numbers. That is incorrect per RFC 1035: A records contain IPv4 addresses only, while the gRPC target supplies the port. I updated the diagram and wording accordingly.
- The Go and Python service-config examples used `loadBalancingPolicy`, which is the deprecated field. Current gRPC documentation uses `loadBalancingConfig`, so I updated both code samples to the current form.
- The Go code comment attributed connection behavior to the DNS resolver. In practice, the resolver returns addresses and the `round_robin` load balancer manages connections to them. I corrected the comment to match the documented behavior.
- The Kubernetes and DNS verification sections implied all matching Pods appear in DNS. Kubernetes headless-Service DNS returns records for ready endpoints, so I tightened that wording.
- The conclusion said `waitForReady: true` makes the channel wait for DNS resolution. That is inaccurate. Wait-for-ready affects matching RPCs when the channel is not ready; it queues them until a connection becomes ready or the deadline is exceeded. I corrected that explanation.

## Review Notes
- The explicit `dns:///` target is technically valid and makes the resolver choice obvious, although DNS is also the default resolver in gRPC-Go unless overridden.
- The post is intentionally IPv4-focused. In dual-stack Kubernetes clusters, the same headless-Service pattern can also produce `AAAA` records for IPv6 endpoints.
