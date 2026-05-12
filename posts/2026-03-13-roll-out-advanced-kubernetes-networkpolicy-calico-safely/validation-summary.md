# Validation Summary: How to Roll Out Advanced Kubernetes NetworkPolicy with Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- Calico (open source, v3.26+) with `projectcalico.org/v3` extended resources
- `kubectl` CLI
- `calicoctl` CLI
- Felix (Calico per-node enforcement daemon)
- Mermaid (for the architecture diagram)

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- NetworkPolicy v1 API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#networkpolicy-v1-networking-k8s-io
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico installation / supported versions: https://docs.tigera.io/calico/latest/about/
- Calico Felix component reference: https://docs.tigera.io/calico/latest/reference/component-resources/felix
- Combining `namespaceSelector` and `podSelector` (AND semantics, KEP/feature since K8s 1.11): https://kubernetes.io/docs/concepts/services-networking/network-policies/#networkpolicy-resource

## Issues Found
No technical issues found.

## Review Notes
- The standard Kubernetes `NetworkPolicy` (`apiVersion: networking.k8s.io/v1`) example is syntactically valid and would be enforced by Calico identically to other CNIs that implement the K8s NetworkPolicy API.
- The first `from` list entry combines `namespaceSelector` (matching `environment: production`) with `podSelector` (matching `app: frontend`) inside the same peer — this correctly expresses AND semantics (pods labeled `app: frontend` *within* production-labeled namespaces). The second `from` entry uses only a `namespaceSelector`, which matches all pods in any namespace labeled `team: observability`. These semantics are documented in the upstream Kubernetes docs.
- Port entries without an explicit `protocol` default to TCP per the v1 API; the DNS rule correctly specifies `protocol: UDP` for port 53.
- Felix is correctly described as the component that enforces policy on each node. In the Calico architecture, Felix programs the dataplane (iptables / eBPF / VPP) from the policy/endpoint state in the datastore.
- The post points readers to `calicoctl apply -f calico-extension-policy.yaml` for Calico-specific extensions (e.g., `projectcalico.org/v3` `NetworkPolicy` / `GlobalNetworkPolicy`) but does not include that YAML inline. That is fine for a guide focused on the standard K8s NetworkPolicy patterns Calico supports, but readers wanting Calico-only features (order, deny actions, advanced selectors, HTTP / ServiceAccount matches) will need to consult the Calico reference docs separately.
- Calico v3.26 is the minimum stated, which is reasonable; current releases are v3.28+. Nothing in the post depends on features that are absent from v3.26.
- Minor stylistic observation (not changed): the mermaid node `B{Calico Policy\nAdvanced K8s NetworkPolicy}` uses `\n` for a line break. GitHub's mermaid renderer historically rendered `<br/>` more reliably than `\n`, but modern mermaid (>= 9.x) accepts `\n` in node text, so this is left as-is.
