# Validation Summary: How to Configure Namespace-Based Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source NetworkPolicy
- Calico Open Source GlobalNetworkPolicy
- Kubernetes namespaces and namespace labels
- kubectl
- Mermaid diagrams

## Sources Consulted
- Calico Open Source GlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico Open Source namespace policy rules: https://docs.tigera.io/calico/latest/network-policy/policy-rules/namespace-policy
- Calico Open Source automatic labels for namespace matching: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-labels
- Calico Open Source network policy overview and default deny guidance: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-network-policy
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/

## Issues Found
- The `allow-same-namespace` example used `namespaceSelector: environment == 'production'`, which allows traffic from any namespace carrying that label rather than strictly the `production` namespace. Changed both ingress and egress namespace selectors to `projectcalico.org/name == 'production'`, matching Calico's documented automatic namespace name label.
- The Mermaid diagram used a raw newline inside a node label. Changed it to a quoted label with `<br/>` so the diagram is valid Mermaid syntax.
- The architecture diagram implied `kube-system` traffic was allowed, but the shown policies do not include an allow rule for that traffic. Changed the diagram label to state that an explicit allow rule is required.
- The conclusion said new namespaces get isolation automatically with no per-namespace policy changes. That is only true for matching GlobalNetworkPolicy rules; the article also uses namespace-scoped NetworkPolicy examples that must be applied per namespace. Updated the sentence to distinguish GlobalNetworkPolicy coverage from per-namespace local controls.

## Review Notes
The Calico policy API version, `NetworkPolicy` and `GlobalNetworkPolicy` kinds, `order`, `selector: all()`, rule-level `namespaceSelector`, and `destination.ports` fields are consistent with current Calico Open Source documentation. In a production policy set, add explicit egress allows for required cluster services such as DNS before relying on a default-deny egress policy.
