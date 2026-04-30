# Validation Summary: How to Handle IPv6 in Go Kubernetes Controllers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Go
- Kubernetes
- client-go
- controller-runtime / Kubebuilder admission webhooks
- IPv6 and dual-stack networking
- Kubernetes Services
- Kubernetes NetworkPolicy

## Sources Consulted
- Kubernetes dual-stack networking docs: https://kubernetes.io/docs/concepts/services-networking/dual-stack/
- Kubernetes cluster networking docs: https://kubernetes.io/docs/concepts/cluster-administration/networking/
- Kubernetes NetworkPolicy docs: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes API reference, `PodStatus` / `podIPs`: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/#podstatus-v1-core
- Kubebuilder admission webhook reference: https://book.kubebuilder.io/reference/admission-webhook.html
- Kubebuilder webhook implementation example: https://master.book.kubebuilder.io/cronjob-tutorial/webhook-implementation.html
- Go `net/netip` package docs: https://pkg.go.dev/net/netip

## Issues Found
1. Several Go snippets were not syntactically correct as written because they contained unused imports, and the webhook snippet was missing the `metav1` import. I removed or corrected imports so each example is internally consistent.

2. The "Detecting Cluster IPv6 Support" example overclaimed what it was checking. The original code said it was checking for an IPv6 service CIDR, but it only inspected node-reported addresses. I narrowed the explanation and renamed the helper to describe what the code actually verifies: IPv6 entries in `Node.status.addresses`.

3. The dual-stack Service snippet comment overstated `PreferDualStack` behavior for the exact manifest shown. Because the example explicitly sets both `IPFamilies`, it is requesting dual-stack allocation rather than demonstrating a single-stack fallback path. I corrected the comment to match the manifest semantics documented by Kubernetes.

4. The CRD webhook example used an older validation method shape and had incorrect IPv6 validation details. I updated it to the current Kubebuilder-style custom validator pattern, rejected IPv4-mapped IPv6 addresses when using `net/netip`, and fixed the `prefixLen` validation so negative values are not silently accepted.

5. The Pod IPv6 example was updated to use `net/netip` consistently, and the NetworkPolicy example comment was narrowed so it no longer implies `ipBlock` is specifically for an "internal" prefix.

## Review Notes
- The node-address helper is a useful signal for IPv6-capable clusters, but it is not a complete dual-stack capability probe by itself. Kubernetes documents cluster IP-family behavior in terms of Pods, Services, and Nodes collectively.
- NetworkPolicy enforcement still depends on the cluster network plugin. Creating a `NetworkPolicy` object alone has no effect unless the chosen CNI implements NetworkPolicy.
- The helpers use `context.Background()` for brevity. In production controllers, it is usually better to propagate the reconcile or request context through client calls.
