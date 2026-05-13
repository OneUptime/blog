# Validation Summary: How to Migrate to Staged Kubernetes NetworkPolicy in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes NetworkPolicy
- Calico StagedKubernetesNetworkPolicy
- kubectl
- Calico Whisker flow logs

## Sources Consulted
- Calico documentation: Staged Kubernetes network policy - https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico documentation: Stage, preview impacts, and enforce policy - https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico documentation: Stage, preview impacts, and enforce policy for Calico 3.30 - https://docs.tigera.io/calico/3.30/network-policy/staged-network-policies
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: About Calico product editions and feature availability - https://docs.tigera.io/calico/latest/about/
- Kubernetes documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The post described Staged Kubernetes NetworkPolicy but used Calico-native `NetworkPolicy` syntax (`kind: NetworkPolicy`, `selector`, `action`, `source`, `destination`, `types`). Changed the example to `kind: StagedKubernetesNetworkPolicy` and Kubernetes NetworkPolicy-style fields (`podSelector`, `policyTypes`, `from`, `to`, and port entries).
- The prerequisites listed Calico v3.26+, but official Calico Open Source staged policy documentation is available for Calico 3.30 and later. Updated the prerequisite to Calico v3.30+.
- The commands used `calicoctl` for staged Kubernetes policies and mentioned `calicoctl apply --dry-run`, but the official staged policy docs show applying these resources with `kubectl`, and the `calicoctl apply` help does not list a `--dry-run` flag or staged policy resource types. Updated commands to use `kubectl` and `kubectl apply --dry-run=server`.
- The implementation and architecture implied staged policies actively enforce or block traffic. Updated wording to clarify that staged policies preview behavior without changing actual traffic flow.
- The metrics example used `felix_denied` as a staged policy hit counter. Official staged policy documentation describes reviewing staged policy impact through generated flow logs, specifically the `policies.pending` field in Calico Whisker. Updated the guidance accordingly.
- The operational commands referenced enforced Calico policy resources (`networkpolicy`, `globalnetworkpolicy`) and inconsistent policy names. Updated them to query, view, and delete staged policy resources with the example policy name.

## Review Notes
The corrected guide now focuses on staging Kubernetes-native NetworkPolicy behavior. It does not cover converting an existing enforced Kubernetes `NetworkPolicy` in detail beyond the key API/kind and command changes; a future expansion could include a before-and-after migration example.
