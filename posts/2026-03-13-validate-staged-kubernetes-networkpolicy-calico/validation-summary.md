# Validation Summary: How to Validate Staged Kubernetes NetworkPolicy in Calico Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source staged network policies
- `StagedKubernetesNetworkPolicy`
- Kubernetes NetworkPolicy
- `kubectl`
- Felix and Whisker flow logs

## Sources Consulted
- Calico staged network policy guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico Staged Kubernetes NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico Staged NetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Felix metrics configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Project Calico v3.26.0 and v3.32.0 manifests on GitHub to confirm staged policy CRD availability: https://github.com/projectcalico/calico

## Issues Found
- The post used `kind: NetworkPolicy` with Calico policy fields while describing Staged Kubernetes NetworkPolicy. Updated the YAML to use `kind: StagedKubernetesNetworkPolicy` and Kubernetes NetworkPolicy-style fields (`podSelector`, `policyTypes`, `from`, `to`, and `ports`), matching Calico's resource reference.
- The prerequisites claimed Calico v3.26+ support. The Calico v3.26 manifest does not include the staged policy CRDs, while current Calico manifests do; updated the prerequisite to Calico v3.30+ with the `StagedKubernetesNetworkPolicy` CRD installed.
- The implementation used `calicoctl apply` and `calicoctl get networkpolicies` for staged Kubernetes policies. Calico's staged policy guide documents using `kubectl`, and the `calicoctl apply` reference does not list staged resources or a `--dry-run` option. Updated commands to use `kubectl apply`, `kubectl apply --dry-run=server`, and `kubectl get/delete stagedkubernetesnetworkpolicy.p`.
- The metrics step suggested checking `felix_denied` on port 9091 for staged policy hit counters. Official staged policy documentation says staged policy impact is shown through the `policies.pending` field in Whisker flow logs. Updated the validation step and architecture diagram accordingly.
- The common issues and conclusion referred to policy ordering for Staged Kubernetes NetworkPolicy. Kubernetes NetworkPolicy syntax does not use Calico `order`; updated the text to focus on Kubernetes selector syntax and bidirectional traffic rules.

## Review Notes
The post is now technically aligned with Calico's current staged Kubernetes NetworkPolicy workflow. A future improvement would be adding a concrete Whisker query or screenshot workflow, but that would be new content rather than a correction.
