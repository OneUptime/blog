# Validation Summary: How to Roll Out ClusterIP Service Policies in Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes (ClusterIP Services, Network Policy)
- calicoctl CLI
- kubectl CLI
- YAML configuration

## Sources Consulted
- Calico NetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico Rule reference (action, source, destination, protocol fields): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#rule
- Calico EntityRule reference (selector, ports under destination): https://docs.tigera.io/calico/latest/reference/resources/networkpolicy#entityrule
- calicoctl apply documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes Service documentation (ClusterIP): https://kubernetes.io/docs/concepts/services-networking/service/

## Issues Found
- **Duplicate `destination:` key in the egress rule**: The first egress rule had two `destination:` mappings on the same rule (one with `selector:` and another with `ports:`). In YAML this is invalid/ambiguous — most parsers either error or silently use only the last occurrence, which would have dropped the `selector` and left the rule allowing egress to port 5432 on any pod. Merged the two mappings into a single `destination:` block containing both `selector` and `ports`, which matches Calico's `EntityRule` schema.

## Review Notes
- The Calico `NetworkPolicy` schema (`projectcalico.org/v3`), `order`, `selector`, `ingress`/`egress` rules, `action: Allow|Deny`, `source`/`destination` with `selector` and `ports`, `protocol: UDP`, and `types: [Ingress, Egress]` are all valid for Calico v3.26+.
- Minor wording quirks in the prose (e.g., "ClusterIP Service Policies policies" in the conclusion, slight awkwardness around NodePort being mentioned in a ClusterIP-focused post) are stylistic, not technical errors, so they were left untouched per the review scope.
- The ingress Deny rule at the end is redundant when `types: [Ingress, Egress]` is set, because Calico's default with a policy selecting a pod is to drop unmatched traffic in the policy's direction. It's not incorrect — explicit Deny rules are a common defensive pattern — just worth noting.
- The verification `curl` snippet relies on `$?` immediately after the `kubectl exec` to capture the exit code; this works as written.
