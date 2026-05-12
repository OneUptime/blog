# Validation Summary: How to Roll Out Zero Trust Network Policy in Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (projectcalico.org/v3 API)
- Kubernetes NetworkPolicy / GlobalNetworkPolicy
- calicoctl, kubectl
- Mermaid diagrams
- Zero Trust networking principles
- Microsegmentation

## Sources Consulted
- Calico documentation on GlobalNetworkPolicy: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation on NetworkPolicy: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico policy ordering and rules reference: https://docs.tigera.io/calico/latest/network-policy/
- Kubernetes Network Policy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes port reference (kubelet on TCP 10250): https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- IANA / RFC 1035 — DNS uses UDP and TCP port 53
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html

## Issues Found
No technical issues found.

The Calico API usage is correct:
- `projectcalico.org/v3` API group is the correct group for `GlobalNetworkPolicy` and `NetworkPolicy` resources.
- `order` semantics are correctly applied — lower `order` values are evaluated first, so the explicit allow policies (`order: 1` for system traffic, `order: 100` for the app rule) are correctly evaluated before the default deny (`order: 10000`).
- The default-deny pattern (listing `types: [Ingress, Egress]` without any ingress/egress rules) is the canonical Calico way to express "deny all of those directions."
- The selectors `all()`, `tier == 'api'`, and `tier == 'frontend'` use valid Calico selector syntax.
- Port choices are correct: DNS (UDP/TCP 53) and kubelet (TCP 10250).
- `--max-time 5` is a valid curl flag, and `$?` correctly captures the exit code of the preceding command (non-zero/timeout when traffic is blocked).

## Review Notes
- The kubelet ingress allow rule (`ports: [10250]` from `10.0.0.0/8`) omits an explicit `protocol: TCP`. This is permissive (matches all protocols on that port) rather than incorrect; kubelet only listens on TCP, so the functional behavior is unaffected. Adding `protocol: TCP` would be a tightening improvement aligned with the zero-trust posture but not strictly required.
- The Mermaid flowchart uses `\n` for in-node line breaks. Most current Mermaid versions render this correctly; if a particular renderer doesn't, `<br/>` is the more portable alternative.
- Calico v3.26+ is listed as a prerequisite; this is a reasonable floor (v3.26 was released June 2023). Readers on newer (v3.28/v3.29/v3.30) versions will see identical behavior for the resources used here.
- The introduction sentence "This guide covers roll out zero trust network policies in Calico" reads awkwardly ("covers roll out" → "covers rolling out"), but this is a stylistic/grammar issue, not a technical error, and was left untouched per the review scope.
- For a production rollout, readers should consider Calico's staged policies / policy preview features to dry-run policies before enforcing default-deny, but the post's "monitoring mode" guidance in the conclusion captures this intent.
