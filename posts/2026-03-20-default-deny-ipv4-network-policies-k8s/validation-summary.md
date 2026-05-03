# Validation Summary: How to Implement Default Deny-All IPv4 Network Policies in Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- CoreDNS / kube-dns
- kubectl CLI
- YAML manifests
- BusyBox/Alpine `wget`
- PostgreSQL (referenced via port 5432)

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- NetworkPolicy v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- Default deny / allow examples: https://kubernetes.io/docs/concepts/services-networking/network-policies/#default-deny-all-ingress-traffic and surrounding sections
- Automatic namespace labels (`kubernetes.io/metadata.name`): https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/ (GA in Kubernetes 1.22)
- CoreDNS / kube-dns service & pod labels: https://github.com/kubernetes/kubernetes (kube-dns Service uses `k8s-app: kube-dns` selector retained by CoreDNS for backward compatibility)
- kubectl run reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#run
- BusyBox wget options (used in `alpine` image)

## Issues Found
No technical issues found.

All NetworkPolicy manifests use the correct stable API version (`networking.k8s.io/v1`), correctly leverage the empty-`podSelector: {}` idiom to match all pods in a namespace, and correctly rely on the documented behavior that a `policyTypes` entry without a corresponding rule list (`ingress`/`egress`) results in a deny-all for that direction. The DNS allow policy targets CoreDNS using the standard `k8s-app: kube-dns` pod label and the auto-populated `kubernetes.io/metadata.name` namespace label, with both UDP and TCP port 53 — all matching the official Kubernetes guidance. The PostgreSQL allow example uses the canonical port 5432. The verification commands (`kubectl run --restart=Never`, `kubectl exec`, `wget -qO- --timeout=3`) are all valid and behave as described.

## Review Notes
- `kubectl run --restart=Never` still works to create a bare Pod, but the `--restart` flag has been deprecated for some time; future-proof alternatives include `kubectl run` (which creates a Pod by default in modern kubectl versions) or applying a Pod manifest directly. This is not incorrect today, just worth noting.
- NetworkPolicy enforcement requires a CNI plugin that supports it (Calico, Cilium, Antrea, Weave, etc.). Plain kube-proxy / Flannel does not enforce NetworkPolicy. The post does not mention this prerequisite — readers on a non-supporting CNI may apply these policies and see no effect. A one-line callout could improve clarity but is not a technical error.
- The `kubernetes.io/metadata.name` namespace label is automatically populated by the apiserver as of Kubernetes 1.22 (GA). On clusters older than 1.22, the DNS allow policy's `namespaceSelector` would not match unless `kube-system` is manually labeled. Most clusters in production today are well past 1.22, so this is acceptable.
- The BusyBox `wget` shipped in `alpine` supports both `-T SEC` and `--timeout=SEC`; the example will work as written.
