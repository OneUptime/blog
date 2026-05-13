# Validation Summary: How to Avoid Common Mistakes with Kubernetes Ingress with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes NetworkPolicy
- Calico network policy
- Calico policy tiers
- kubectl
- YAML

## Sources Consulted
- Kubernetes Network Policies documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Calico Open Source tiered policy documentation: https://docs.tigera.io/calico/latest/network-policy/policy-tiers/tiered-policy
- Calico Tier resource reference: https://docs.tigera.io/calico/latest/reference/resources/tier

## Issues Found
- The post incorrectly stated that a Kubernetes deny-all ingress NetworkPolicy blocks kubelet liveness and readiness probes. Kubernetes documentation states that pods cannot block incoming traffic from their resident node through NetworkPolicy. I changed the section to explain that kubelet probe failures after a deny-all rollout are usually caused by application dependency access, probe configuration, or separate host/firewall policy, and not by Kubernetes NetworkPolicy blocking the kubelet probe itself.
- The health-check fix recommended a broad node-subnet `ipBlock` allow. Because Kubernetes NetworkPolicy does not block resident-node probe traffic, this is unnecessary and can be overly permissive. I replaced it with a correct default-deny example and guidance to add host-level health-check allows only when Calico host endpoint policy or another host firewall can block that traffic.
- The diagnosis command for policies selecting a pod only matched one exact `matchLabels.app` shape and missed policies such as `podSelector: {}` or selectors using other labels. I replaced it with `kubectl get networkpolicy -n <namespace> -o wide` and `kubectl describe networkpolicy -n <namespace>` guidance so readers inspect all relevant selectors in the target namespace.
- The post referred to Calico Enterprise's tiered policy model. Current Calico Open Source documentation includes tiered policy support, so I changed the wording to Calico's tiered policy model.

## Review Notes
Local `kubectl` verification was not possible because `kubectl` is not installed in this environment, so command validation used official Kubernetes CLI documentation instead. The remaining selector and union-semantics explanations match Kubernetes NetworkPolicy behavior: policies are additive, empty pod selectors match all pods in scope, `namespaceSelector` alone selects all pods in matching namespaces, and a single peer entry containing both `namespaceSelector` and `podSelector` combines them.
