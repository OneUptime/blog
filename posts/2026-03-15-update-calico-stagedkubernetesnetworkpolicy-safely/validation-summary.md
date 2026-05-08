# Validation Summary: How to Update the Calico StagedKubernetesNetworkPolicy Resource Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Enterprise
- Calico StagedKubernetesNetworkPolicy
- Kubernetes NetworkPolicy
- kubectl
- YAML manifests
- Kubernetes RBAC and Events

## Sources Consulted
- Calico Enterprise Staged Kubernetes network policy resource reference: https://docs.tigera.io/calico-enterprise/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico Enterprise staged policy workflow documentation: https://docs.tigera.io/calico-enterprise/latest/network-policy/staged-network-policies
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The YAML examples included `spec.stagedAction: Set`, which is not part of the documented StagedKubernetesNetworkPolicy spec. Removed the field from both manifests so the examples match Calico's documented staged Kubernetes policy structure.
- The prerequisites listed `calicoctl` as required, but the guide uses Kubernetes custom resources through `kubectl` only. Removed the unused requirement.
- The introduction and conclusion referred to "committing" staged policy changes. Calico Enterprise documentation describes enforcing staged policy by creating or updating the corresponding enforced policy, so the wording was changed to "enforcement" and "create or update the corresponding enforced policy."

## Review Notes
The remaining `kubectl apply`, `kubectl get`, `--dry-run=server`, `--field-selector`, `--sort-by`, label selector, JSONPath, backup, and rollback commands are syntactically valid according to Kubernetes CLI documentation. The staged policy examples now follow the Kubernetes NetworkPolicy-style fields documented for Calico StagedKubernetesNetworkPolicy.
