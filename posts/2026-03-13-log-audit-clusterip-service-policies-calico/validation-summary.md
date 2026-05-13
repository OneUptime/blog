# Validation Summary: How to Log and Audit ClusterIP Service Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source NetworkPolicy (`projectcalico.org/v3`)
- Kubernetes Services and ClusterIP networking
- `calicoctl`
- `kubectl exec`
- Mermaid diagrams

## Sources Consulted
- Calico NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico ClusterIP service policy documentation: https://docs.tigera.io/calico/latest/network-policy/services/services-cluster-ips
- Calico staged network policies documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes `kubectl exec` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The policy example claimed to log/audit traffic but did not include Calico `Log` actions. Added `Log` rules before the final `Deny` rules for ingress and egress so unmatched traffic is logged before enforcement denies it. Calico documents `Log` as a valid policy action and notes that processing continues with the next rule.
- The egress database rule had two `destination` keys, which is invalid/ambiguous YAML and would drop one of the mappings in common parsers. Combined the destination selector and port list under a single `destination` object.
- The TCP application port rules did not declare `protocol: TCP`. Added explicit TCP protocol matches for the backend, monitoring, and database rules to match Calico's documented port-rule examples and avoid ambiguous port matching.
- The introduction implied unrestricted external reachability for ClusterIP services in general. Updated the wording to distinguish normal in-cluster reachability from externally advertised ClusterIPs or NodePort services.

## Review Notes
- The corrected YAML block was parsed locally and checked for the expected Calico API version, `NetworkPolicy` kind, and ingress/egress `Log` rules.
- The verification command syntax for `calicoctl apply -f` and `kubectl exec ... -- COMMAND` matches the official references.
