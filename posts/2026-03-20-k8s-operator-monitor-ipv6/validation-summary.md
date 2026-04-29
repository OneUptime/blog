# Validation Summary: How to Monitor Operator-Managed IPv6 Resources

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes operators
- IPv6 and dual-stack networking
- Go
- controller-runtime
- client-go
- KIND
- OneUptime

## Sources Consulted
- Kubernetes dual-stack concepts: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack validation guide: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- kind configuration guide: https://kind.sigs.k8s.io/docs/user/configuration/
- Go `net` package documentation: https://pkg.go.dev/net
- controller-runtime reconcile package docs: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/reconcile
- controller-runtime client package docs: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/client
- controller-runtime log package docs: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/log
- OneUptime IP Monitor docs: https://oneuptime.com/docs/monitor/ip-monitor
- OneUptime Synthetic Monitor docs: https://oneuptime.com/docs/monitor/synthetic-monitor
- OneUptime monitoring product page: https://oneuptime.com/product/monitoring

## Issues Found
- The post metadata claimed Prometheus metrics and custom alerts, but the article content did not cover Prometheus configuration or alert rules. I removed the `Prometheus` tag and updated the description and overview to match the actual material in the post.
- The original `isIPv6Enabled` example treated any IPv6 node address as proof of cluster IPv6 support and ignored client/list errors. I changed it to check node `spec.podCIDRs` for IPv6 CIDRs and to return errors from `kubernetes.NewForConfig` and `Nodes().List`, which matches Kubernetes dual-stack validation guidance more closely.
- The `GetIPVersion` comment was inaccurate because the function can also return `invalid`. I corrected the comment to match the implementation.
- The original KIND verification commands were unreliable because `kubectl get ... -o wide` does not validate dual-stack addressing by itself, and `grep "2001:"` assumes an address prefix that KIND does not use by default. I replaced those commands with `go-template` checks for node `podCIDRs` and pod `status.podIPs`, following Kubernetes dual-stack validation guidance.
- The OneUptime monitoring sentence specifically described synthetic checks "from IPv6 addresses", which was more specific than the product documentation clearly supports in that wording. I changed it to the broader and accurate statement that monitors can check health and metrics endpoints over IPv6.
- The conclusion referenced `IPFamilyPolicy` generically. I updated it to the Kubernetes field name `.spec.ipFamilyPolicy` and aligned the conclusion with the corrected cluster-validation approach.

## Review Notes
- The controller-runtime APIs used in the reconciler example are current as of April 29, 2026: `Reconcile(ctx context.Context, req ctrl.Request)` and `client.IgnoreNotFound(err)` are valid.
- The Go IPv6 validation helpers are correct for distinguishing IPv4 from IPv6 using `net.ParseIP` and `IP.To4()`. As written, IPv4-mapped IPv6 literals are treated as IPv4, which is usually the safer behavior for operator-managed native IPv6 resources.
- The KIND dual-stack configuration snippet is current, but dual-stack operation still depends on host/container runtime IPv6 support as documented by kind.
