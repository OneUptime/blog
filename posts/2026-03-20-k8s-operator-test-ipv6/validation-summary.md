# Validation Summary: How to Test Kubernetes Operators with IPv6 Clusters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes dual-stack / IPv6 networking
- KIND
- Kubebuilder `envtest`
- controller-runtime
- client-go
- Go
- OneUptime

## Sources Consulted
- Kubernetes dual-stack documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes dual-stack validation guide: https://kubernetes.io/docs/tasks/network/validate-dual-stack/
- KIND configuration documentation: https://kind.sigs.k8s.io/docs/user/configuration/
- Kubebuilder envtest reference: https://book.kubebuilder.io/reference/envtest
- Kubebuilder controller testing guide: https://book.kubebuilder.io/cronjob-tutorial/writing-tests.html
- Go `net` package documentation: https://pkg.go.dev/net
- `k8s.io/client-go/kubernetes` package documentation: https://pkg.go.dev/k8s.io/client-go/kubernetes
- `sigs.k8s.io/controller-runtime/pkg/client` package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/client
- OneUptime IP Monitor documentation: https://oneuptime.com/docs/monitor/ip-monitor
- OneUptime Website Monitor documentation: https://oneuptime.com/docs/monitor/website-monitor
- OneUptime Synthetic Monitor documentation: https://oneuptime.com/docs/monitor/synthetic-monitor
- OneUptime Custom Probe documentation: https://oneuptime.com/docs/probe/custom-probe

## Issues Found
- The overview and description implied that `envtest` can validate real dual-stack or IPv6-only cluster networking. Updated the wording to scope `envtest` to API-level controller and webhook tests, which matches Kubebuilder's `envtest` documentation that it runs only `etcd` and `kube-apiserver`.
- The IPv6 detection helper was named and described as a full cluster IPv6 support check, but it only inspected node addresses and ignored client/list errors. Updated it to `hasIPv6NodeAddress`, added error handling, and described it as detecting IPv6 node addresses rather than proving full cluster support.
- The KIND verification commands used `kubectl get ... -o wide` and `grep "2001:"`, which is not a reliable dual-stack validation method. Replaced them with upstream-style `go-template` checks for `.spec.podCIDRs`, `.status.addresses`, and `.status.podIPs`, and noted that KIND uses `networking.ipFamily: ipv6` for IPv6-only clusters.
- The OneUptime monitoring note over-specified synthetic monitors "from IPv6 addresses" without matching the published monitor docs. Updated it to documented IPv6-capable monitor types: IP monitors for direct IPv6 targets, and website or synthetic monitors via an IPv6-capable custom probe for private HTTP endpoints.
- The conclusion previously grouped `envtest`, service `IPFamilyPolicy`, and cluster testing too loosely. Revised it so the responsibilities are separated accurately: `envtest` for API-level tests, real clusters for networking behavior, and `IPFamilyPolicy` validation when the operator manages Services.

## Review Notes
- KIND's current configuration docs still use `kind.x-k8s.io/v1alpha4` and document `networking.ipFamily: dual` for dual-stack and `networking.ipFamily: ipv6` for IPv6-only clusters.
- Kubernetes documents dual-stack as stable since v1.23, while noting support for dual-stack clusters on Kubernetes 1.20+ with the required provider and CNI support.
- The local workspace did not have `kind` or `kubectl` installed, so CLI syntax was verified against official documentation rather than local `--help` output.
