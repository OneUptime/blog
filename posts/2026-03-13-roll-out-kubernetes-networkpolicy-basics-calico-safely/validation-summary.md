# Validation Summary: How to Roll Out Kubernetes NetworkPolicy Basics with Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- Calico (v3.26+) as the network policy enforcement engine
- kubectl
- calicoctl
- Mermaid (for the architecture diagram)

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/
- Calico documentation — Kubernetes NetworkPolicy: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-policy/
- Calico Felix (policy enforcement component): https://docs.tigera.io/calico/latest/reference/component-resources/felix/
- kubectl command reference: https://kubernetes.io/docs/reference/kubectl/
- Calico v3.26 release notes: https://docs.tigera.io/calico/3.26/release-notes/

## Issues Found
No technical issues found.

The YAML manifest correctly uses the `networking.k8s.io/v1` API, with valid `podSelector`, `policyTypes`, `ingress`, and `egress` field structure. Both ingress (frontend → backend on 8080) and egress (backend → database on 5432, plus DNS on 53/UDP to anywhere) rules are well-formed and semantically correct. The kubectl commands (`apply`, `describe networkpolicy`, `exec`) are syntactically valid.

## Review Notes
- The Introduction references the `projectcalico.org/v3` API, but the example uses the standard `networking.k8s.io/v1` Kubernetes NetworkPolicy resource. This is not incorrect — Calico's Felix component does enforce standard Kubernetes NetworkPolicy objects — but a future revision could clarify that this guide intentionally uses upstream Kubernetes NetworkPolicy (rather than Calico's extended `NetworkPolicy`/`GlobalNetworkPolicy` types) for portability.
- The Mermaid node label uses `\n` for a line break inside a decision node (`B{Calico Policy\nKubernetes NetworkPolicy Basics}`). This still works in current Mermaid versions, but `<br/>` is the more reliable and modern syntax. Not a technical error.
- The DNS egress rule (port 53/UDP) is unrestricted (no `to` selector), allowing DNS to any destination. This is a common and recommended pattern for cluster DNS, but in stricter environments it would be limited to `kube-system`'s CoreDNS pods.
- Calico v3.26 (April 2023) is supported as a minimum but is no longer the latest; current Calico is in the v3.28–v3.29 line. The post's "v3.26+" wording remains accurate.
