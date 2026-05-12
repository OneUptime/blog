# Validation Summary: How to Test ClusterIP Service Policies in Calico with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes NetworkPolicy
- ClusterIP Services
- calicoctl CLI
- kubectl CLI

## Sources Consulted
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico selector syntax: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#selectors
- calicoctl apply command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- YAML 1.2 specification (duplicate-key handling)

## Issues Found
- **Duplicate `destination:` key in the egress rule.** The first egress rule contained two `destination:` mappings at the same level:
  ```yaml
  - action: Allow
    destination:
      selector: app == 'database'
    destination:
      ports: [5432]
  ```
  This is invalid YAML — strict parsers (including the one used by `kubectl`/`calicoctl`) reject duplicate keys, and lenient parsers would silently discard the `selector`, leaving an unintended "allow port 5432 to any destination" rule. Merged the two mappings into a single `destination:` block containing both `selector` and `ports`, which is the correct Calico schema and matches the post's stated intent (allow egress to database pods on port 5432).

## Review Notes
- The `apiVersion: projectcalico.org/v3`, `kind: NetworkPolicy`, `order`, `selector`, `ingress`/`egress` rules with `action`, `source`, `destination`, and `types: [Ingress, Egress]` are all valid Calico schema fields.
- Bare `- action: Deny` rules at the end of each direction are valid catch-all denies; combined with `types: [Ingress, Egress]` this enforces default-deny semantics for the selected pods.
- Minor wording quirks (e.g. "ClusterIP Service Policies policies" in the Conclusion; the Introduction conflating ClusterIP with external/NodePort exposure) are stylistic rather than technical and were left untouched per the review scope. Note for future revision: ClusterIP services are not exposed externally — only NodePort/LoadBalancer/Ingress are — so the sentence about "clusters that expose services to external traffic" mixes concepts.
- Calico NetworkPolicies select pods, not Services. Traffic to a ClusterIP is DNATed to a backend pod before policy evaluation, so policies attached to backend-pod selectors (as shown) correctly govern ClusterIP-routed traffic.
- Calico v3.26+ prerequisite is reasonable; all features used in the post (namespaced NetworkPolicy, selector syntax, ordered rules) have been stable well before that release.
