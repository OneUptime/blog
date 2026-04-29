# Validation Summary: How to Debug Operator IPv6 Connectivity Issues

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- Kubernetes
- Kubernetes operators
- IPv6
- Dual-stack networking
- Go
- controller-runtime
- client-go
- kind
- OneUptime

## Sources Consulted
- Kubernetes dual-stack concepts: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack validation guide: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- Kubernetes Downward API reference: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- kind configuration guide: https://kind.sigs.k8s.io/docs/user/configuration/
- Go `net` package documentation: https://pkg.go.dev/net
- client-go `kubernetes` package docs: https://pkg.go.dev/k8s.io/client-go/kubernetes
- client-go core/v1 client docs: https://pkg.go.dev/k8s.io/client-go/kubernetes/typed/core/v1
- controller-runtime `log` package docs: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/log
- controller-runtime `client` package docs: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/client
- OneUptime IP Monitor docs: https://oneuptime.com/docs/monitor/ip-monitor
- OneUptime Website Monitor docs: https://oneuptime.com/docs/monitor/website-monitor
- OneUptime monitoring overview: https://oneuptime.com/product/monitoring

## Issues Found
- The original `isIPv6Enabled` example used node addresses as a proxy for cluster IPv6 support and ignored errors. I changed it to inspect `node.Spec.PodCIDRs` for IPv6 CIDRs and to return errors from `kubernetes.NewForConfig` and `Nodes().List`, which better matches Kubernetes dual-stack validation guidance.
- The original `GetIPVersion` comment was inaccurate because the function can also return `invalid`. I corrected the comment to match the implementation.
- The original KIND verification commands were not reliable for dual-stack validation. `kubectl get ... -o wide` does not prove dual-stack is configured, and `grep "2001:"` assumes an IPv6 prefix that kind does not use by default. I replaced those commands with `go-template` checks for `spec.podCIDRs` and `status.podIPs`, following Kubernetes validation guidance.
- The OneUptime sentence specifically recommended synthetic monitors "from IPv6 addresses", which was more specific than the official product documentation clearly supported in that wording. I changed it to the documented monitor types and kept the IPv6 monitoring claim.
- The conclusion referenced dual-stack service creation with `IPFamilyPolicy`, but that topic was not actually covered in the post. I aligned the conclusion with the validated content about IPv6 parsing and cluster verification.

## Review Notes
- The controller-runtime APIs shown in the reconciler example are current: `log.FromContext(ctx)` and `client.IgnoreNotFound(err)` remain valid.
- The Go IPv6 helper functions are technically correct for distinguishing IPv4 and IPv6 using `net.ParseIP`, `net.ParseCIDR`, and `IP.To4()`.
- kind still supports `networking.ipFamily: dual`, but dual-stack operation depends on host and container runtime IPv6 support as documented by kind.
- `kind`, `kubectl`, and `go` were not installed in the workspace, so command and API verification was done against official documentation rather than local CLI output.
