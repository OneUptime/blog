# Validation Summary: How to Build Kubernetes Operators That Handle IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Kubernetes
- Kubernetes Operators
- controller-runtime
- Kubebuilder CRD markers
- Go
- IPv6

## Sources Consulted
- Kubebuilder Book, CRD validation markers: https://book.kubebuilder.io/reference/markers/crd-validation
- Kubebuilder Book, metrics configuration and current `main.go` scaffold patterns: https://book.kubebuilder.io/reference/metrics
- Kubebuilder Book, `main.go` walkthrough: https://book.kubebuilder.io/cronjob-tutorial/main-revisited.html
- controller-runtime `manager.Options` documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/manager
- controller-runtime metrics server options: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/metrics/server
- controller-runtime health checks: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/healthz
- controller-runtime root package examples: https://pkg.go.dev/sigs.k8s.io/controller-runtime
- Go `net` package docs for `ParseIP` and `ParseCIDR`: https://pkg.go.dev/net
- Kubernetes dual-stack Services documentation: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes API reference for `PodStatus.podIPs`: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/
- Kubernetes CEL IP/CIDR library reference: https://kubernetes.io/docs/reference/using-api/cel/
- RFC 4291, IPv6 unspecified address semantics: https://datatracker.ietf.org/doc/html/rfc4291

## Issues Found
- The `main.go` example used the old `MetricsBindAddress` field, but current `controller-runtime` uses `Metrics: metricsserver.Options{BindAddress: ...}`. Updated the snippet to the current API and aligned it with current Kubebuilder/controller-runtime docs.
- The `main.go` snippet also had compile and runtime gaps: unused imports, no scheme initialization, an unqualified reconciler type reference, no registered `healthz`/`readyz` checks, and ignored `mgr.Start` errors. Added the minimal missing pieces so the example matches current operator scaffolding.
- The CRD regex markers did not correctly validate IPv6 syntax. They could accept invalid values and give a false sense of correctness. Removed those markers and made it explicit that validation is performed in reconcile logic instead.
- The CRD section did not show the status subresource marker even though the reconciler used `r.Status().Update(...)`. Added `+kubebuilder:subresource:status` on the root resource type so the status update path is technically consistent.
- The reconciler only validated `IPv6Address`, not `IPv6CIDR`, despite the post claiming both should be validated. Added `net.ParseCIDR`-based IPv6 CIDR validation.
- The reconciler ignored errors from `List` and `Status().Update`, which would hide API failures. Added proper error handling for both operations.
- The monitoring example used `[::]:8080/metrics` as if it were a reachable destination URL. `[::]` is the IPv6 unspecified address, used for binding rather than as a remote target. Replaced it with a real IPv6 URL example using a pod or Service IPv6 address.
- The conclusion mentioned only `net.ParseIP`, even though correct IPv6 CIDR handling also needs `net.ParseCIDR`. Updated the conclusion to match the corrected implementation.

## Review Notes
- Kubernetes dual-stack Service behavior in the post is accurate: `PreferDualStack` requests dual-stack allocation on dual-stack clusters and falls back to single-stack behavior on single-stack clusters.
- `pod.Status.PodIPs` is the correct field to inspect for dual-stack pod addresses; Kubernetes documents at most one IPv4 and one IPv6 address per Pod.
- Kubernetes CEL includes IP and CIDR helper libraries in newer releases, but those libraries are version-gated in Kubernetes 1.31+. Using Go runtime validation keeps the example broadly compatible without introducing an unstated Kubernetes version dependency.
