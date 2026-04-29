# Validation Summary: How to Handle Dual-Stack Service Endpoints in Operators

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes operators
- IPv6 and dual-stack networking
- Services and EndpointSlices
- Go
- controller-runtime
- client-go
- kind
- OneUptime

## Sources Consulted
- Kubernetes dual-stack concepts: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes Service concepts: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice concepts: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes dual-stack validation task: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes Endpoints deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- kind configuration guide: https://kind.sigs.k8s.io/docs/user/configuration/
- Go `net` package documentation: https://pkg.go.dev/net
- controller-runtime reconcile package docs: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/reconcile
- controller-runtime client package docs: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/client
- controller-runtime log package docs: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/log
- OneUptime IP Monitor docs: https://oneuptime.com/docs/monitor/ip-monitor
- OneUptime monitoring product page: https://oneuptime.com/product/monitoring

## Issues Found
- The description and overview incorrectly referenced the legacy `Endpoints` API for dual-stack service endpoint handling. I changed them to refer to dual-stack Service fields and EndpointSlices, because Kubernetes documents that the deprecated Endpoints API does not support dual-stack clusters.
- The original cluster-check example treated any IPv6 node address as proof of cluster IPv6 support and ignored client and list errors. I changed it to return errors and to check Node `spec.podCIDRs` as well as node addresses, which aligns better with Kubernetes dual-stack validation guidance.
- The Go helper comments were too broad. `IsValidIPv6` and `IsValidIPv6CIDR` reject IPv4-mapped IPv6 inputs because they use `IP.To4()`, and `GetIPVersion` can also return `invalid`. I corrected the comments to match the actual behavior.
- The original KIND verification commands were unreliable because `kubectl get ... -o wide` does not validate dual-stack behavior and `grep "2001:"` assumes a specific IPv6 prefix. I replaced them with a Node `podCIDRs` check and a Service validation flow using `.spec.ipFamilyPolicy: PreferDualStack`, which matches the Kubernetes documentation.
- The OneUptime section claimed synthetic checks run "from IPv6 addresses", which was more specific than the product documentation clearly established. I changed that to the verified capability of monitoring IPv6 targets by address or AAAA-backed hostname.
- The conclusion now refers to the actual Service field name, `.spec.ipFamilyPolicy`, and explicitly notes that operators needing backend endpoint data on dual-stack clusters should use EndpointSlices instead of Endpoints.

## Review Notes
- The controller-runtime APIs shown in the reconciler example are current as of April 29, 2026: `Reconcile(ctx context.Context, req ctrl.Request)`, `log.FromContext(ctx)`, and `client.IgnoreNotFound(err)` are all valid.
- The `kind` dual-stack configuration shown in the post is current, but official `kind` documentation still notes dual-stack support requires `kind` 0.11+ and Kubernetes 1.20+, and actual IPv6 operation depends on host/container runtime support.
- The post is now technically accurate, but it still stops short of showing a concrete `EndpointSlice` read path in an operator. That would be a reasonable future expansion if the article is later deepened.
