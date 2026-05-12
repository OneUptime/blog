# Validation Summary: How to Secure Calico Component Metrics Monitoring

## Status
validated

## Post Type
Tutorial / Security hardening guide

## Technologies Covered
- Calico (Felix, Typha, kube-controllers)
- Kubernetes NetworkPolicy
- Kubernetes RBAC (Role, ClusterRole)
- cert-manager
- Prometheus / Prometheus Operator (ServiceMonitor)
- Mermaid (mindmap diagram)

## Sources Consulted
- Calico Felix Configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico hardway install (node ports): https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-node
- Kubernetes RBAC API reference (PolicyRule schema): https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- cert-manager Certificate usage: https://cert-manager.io/docs/usage/certificate/
- Prometheus Operator API reference (ServiceMonitor / monitoring.coreos.com/v1): https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- **Security Control 4 (Prometheus RBAC for Scraping): invalid `namespaces` field in a ClusterRole rule.** The original YAML included `namespaces: ["calico-system"]` inside a `PolicyRule`. The Kubernetes `rbac.authorization.k8s.io/v1` `PolicyRule` schema only defines `verbs`, `apiGroups`, `resources`, `resourceNames`, and `nonResourceURLs` — there is no `namespaces` field. The manifest would be rejected by the API server, and a `ClusterRole` is cluster-scoped by definition. Since the author's stated intent (per the comment) was to limit Prometheus to scraping the `calico-system` namespace, I converted the resource to a namespaced `Role` in `calico-system` and removed the invalid `namespaces` field. This correctly expresses the namespace restriction in Kubernetes RBAC.

## Review Notes
- The cert-manager `Certificate` (`cert-manager.io/v1`) with `ECDSA` / size `256` is valid (P-256 curve).
- `FelixConfiguration` fields `prometheusMetricsEnabled` and `prometheusMetricsPort` are valid; default port `9091` is correct.
- The kubelet liveness/readiness port `9099` on calico-node is correct.
- The `NetworkPolicy` peer combining `namespaceSelector` and `podSelector` under the same list item is correct AND-semantics (pods matching both the namespace and the pod label).
- The author already flags that "TLS for metrics requires Calico Enterprise or specific versions" — this is an accurate caveat, since upstream Calico Open Source historically did not support native TLS for Felix's Prometheus endpoint (typically requires reverse proxy or Enterprise/Tigera-only features). Worth noting if revisited in a future Calico version.
- The Role in Security Control 3 uses `resourceNames` with `get/update/patch` and a separate rule without `resourceNames` for `list/watch` — this is the correct workaround because Kubernetes RBAC does not support `resourceNames` for `list`/`watch` verbs.
