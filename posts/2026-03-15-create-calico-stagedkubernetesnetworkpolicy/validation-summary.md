# Validation Summary: How to Create the Calico StagedKubernetesNetworkPolicy Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico StagedKubernetesNetworkPolicy
- Calico Enterprise staged policies
- Kubernetes NetworkPolicy
- Kubernetes CRDs
- kubectl

## Sources Consulted
- Calico Open Source staged Kubernetes network policy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico Enterprise staged policy workflow documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/staged-network-policies
- Calico staged policy workflow documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Kubernetes NetworkPolicy concept documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes NetworkPolicy v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/policy-resources/network-policy-v1/

## Issues Found
- Removed `spec.stagedAction: Set` from all `StagedKubernetesNetworkPolicy` YAML examples. The official Calico resource reference states that a staged Kubernetes network policy uses the Kubernetes NetworkPolicy structure with only `apiVersion` and `kind` changed; `stagedAction` is not part of the Kubernetes NetworkPolicy spec.
- Updated the verification text that told readers to confirm `stagedAction` was `Set`, because that field is not valid for `StagedKubernetesNetworkPolicy`.
- Clarified the namespace isolation description. In Kubernetes NetworkPolicy, separate `from` peers are ORed, and a `podSelector` without a `namespaceSelector` selects pods in the policy's own namespace rather than a separate namespace.
- Changed "approved external services" to "approved destinations" in the egress example because the shown policy allows `10.0.0.0/8` and UDP/53 DNS destinations, not named external services.

## Review Notes
The `kubectl get`, `kubectl describe`, and `kubectl apply -f` commands are valid for Kubernetes custom resources when the Calico CRDs are installed. The egress DNS rule with an empty `to` list is valid Kubernetes NetworkPolicy syntax and matches all destinations on UDP port 53.
