# Validation Summary: How to Test Kubernetes NetworkPolicy Basics Enforced by Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- Calico (v3.26+) as the network policy enforcement engine
- Felix (Calico's per-node policy enforcement agent)
- `kubectl` and `calicoctl` CLIs
- Mermaid diagrams

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- Calico documentation - Kubernetes Network Policy: https://docs.tigera.io/calico/latest/network-policy/policy-rules/kubernetes
- Calico Felix component overview: https://docs.tigera.io/calico/latest/reference/architecture/overview
- `kubectl exec` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#exec

## Issues Found
No technical issues found.

The NetworkPolicy manifest uses the correct `apiVersion: networking.k8s.io/v1`, the `kind`, `podSelector`, `policyTypes`, `ingress`, and `egress` fields are valid and properly nested, and the rule shapes (pod-to-pod via `podSelector` and UDP/53 egress for DNS) are correct. `kubectl apply`, `kubectl describe networkpolicy`, and `kubectl exec` syntax are all accurate. The claim that Calico enforces standard Kubernetes NetworkPolicy via Felix is correct, and the `projectcalico.org/v3` API group reference is accurate (even though the example shown is a vanilla Kubernetes NetworkPolicy rather than a Calico CRD).

## Review Notes
- The introduction references the `projectcalico.org/v3` API but the example uses the upstream `networking.k8s.io/v1` `NetworkPolicy`. This isn't incorrect (Calico does enforce both), but a future revision could clarify the distinction between Kubernetes NetworkPolicy and Calico's own `NetworkPolicy`/`GlobalNetworkPolicy` CRDs.
- The Mermaid diagram uses `\n` for line breaks inside a node label. This is still rendered by most Mermaid versions, but `<br/>` is the more portable form and would be safer for future Mermaid releases.
- The "Test connectivity" example assumes `frontend-pod` and `other-pod` exist in the `production` namespace; readers may need to create those pods (or use `kubectl run`) first. The post does not call this out, but it isn't strictly a technical inaccuracy.
- Calico v3.26 was released in 2023 and is supported; newer releases (v3.27, v3.28) are also fine, so the `v3.26+` floor is reasonable.
