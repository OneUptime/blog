# Validation Summary: How to Test Advanced Kubernetes NetworkPolicy with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- Calico (v3.26+) and `projectcalico.org/v3` API
- Calico `calicoctl` CLI
- `kubectl` CLI
- Felix (Calico's per-node policy enforcement agent)
- Mermaid (for the architecture diagram)

## Sources Consulted
- Kubernetes NetworkPolicy reference: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy API reference (`networking.k8s.io/v1`): https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/#networkpolicy-v1-networking-k8s-io
- Calico documentation — Kubernetes NetworkPolicy: https://docs.tigera.io/calico/latest/network-policy/get-started/kubernetes-policy/
- Calico architecture / Felix: https://docs.tigera.io/calico/latest/reference/architecture/overview
- `calicoctl` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/
- Mermaid flowchart syntax (line breaks via `<br/>`): https://mermaid.js.org/syntax/flowchart.html

## Issues Found
- Mermaid diagram used `\n` as a line break inside a decision node (`B{Calico Policy\nAdvanced K8s NetworkPolicy}`). Mermaid's documented line-break syntax for node labels is `<br>` / `<br/>`; `\n` typically renders as the literal characters in most renderers (including GitHub's). Replaced with `<br/>` so the diagram renders correctly.

## Review Notes
- The NetworkPolicy YAML is structurally correct:
  - The first `ingress.from` list item correctly combines `namespaceSelector` and `podSelector` under the same list element (AND semantics — pods labeled `app: frontend` *within* namespaces labeled `environment: production`).
  - The second `from` element selects all pods in namespaces labeled `team: observability` (namespace-only OR semantics relative to the first item).
  - Egress ports 5432 (PostgreSQL), 6379 (Redis), 53/UDP (DNS), and 443/TCP (HTTPS) are valid and protocols default to TCP when unspecified — matches the intended use.
- `policyTypes: [Ingress, Egress]` is valid; explicitly listing `Egress` is required whenever egress rules are present, which the post does correctly.
- Felix as the per-node enforcer in Calico is accurate.
- Calico v3.26 is a real release (June 2023); newer minor releases (v3.27/v3.28) exist as of the validation date. The post's "v3.26+" prerequisite remains accurate but readers on the latest releases will not be affected by anything in this post.
- Stylistic/grammar awkwardness in the intro and conclusion ("Test Advanced Kubernetes NetworkPolicy with Calico requires…", "This guide covers test Advanced K8s NetworkPolicy…") is not a technical issue and was intentionally left untouched per the review scope.
- The post references `calicoctl apply -f calico-extension-policy.yaml` but does not show the contents of `calico-extension-policy.yaml`. This is a content-completeness observation, not a technical error.
