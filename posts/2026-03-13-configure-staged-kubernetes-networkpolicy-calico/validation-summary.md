# Validation Summary: How to Configure Staged Kubernetes NetworkPolicy in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico staged network policies
- Kubernetes NetworkPolicy
- Kubernetes custom resources
- kubectl
- Calico Whisker flow logs

## Sources Consulted
- Calico Documentation: Staged Kubernetes network policy - https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico Documentation: Stage, preview impacts, and enforce policy - https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico Documentation: Staged network policy - https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico Documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Tigera News: Calico Open Source 3.30 announcement - https://www.tigera.io/news/calico-open-source-introduces-version-3-30-ushering-in-a-new-era-of-network-security-and-observability-for-calico-and-kubernetes/
- Kubernetes Documentation: Network Policies - https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The main YAML used `kind: NetworkPolicy` with Calico policy fields such as `order`, `selector`, `action`, `source`, and `destination`, which is not a Staged Kubernetes NetworkPolicy. Changed it to `kind: StagedKubernetesNetworkPolicy` and updated the spec to the Kubernetes NetworkPolicy schema using `podSelector`, `policyTypes`, `from`, `to`, and `ports`.
- The post described staged policies as enforced controls. Updated the wording to clarify that staged policies preview traffic impact before enforcement.
- The post said Calico staged Kubernetes policy support comes through `GlobalNetworkPolicy` and `NetworkPolicy`. Updated this to the staged resources `StagedKubernetesNetworkPolicy`, `StagedNetworkPolicy`, and `StagedGlobalNetworkPolicy`.
- The commands used `calicoctl` to apply and inspect staged Kubernetes policies. Official Calico documentation shows staged policies being applied with `kubectl`, and the staged Kubernetes policy resource documents kubectl aliases. Updated apply, get, describe, and delete commands to use `kubectl` and `stagedkubernetesnetworkpolicy.p`.
- The metrics example checked `felix_denied`, which is not the documented way to preview staged policy impact. Updated the guidance to use Calico Whisker flow logs and the `policies.pending` field for staged policy preview.
- The architecture diagram said Felix enforces the staged policy and Prometheus exposes hit counters. Updated it to show Calico evaluating the staged policy and Whisker exposing pending policy impact.
- The common issues and conclusion referred to policy ordering and enforced behavior for this staged Kubernetes policy flow. Updated those notes to focus on the correct staged Kubernetes resource, CRD/API availability, selector syntax, DNS egress, and enforcement after validation.
- The prerequisites claimed Calico v3.26+ and required `calicoctl`. Updated this to Calico v3.30+ with the Calico API server and staged policy resources installed, and kept only `kubectl` as the required CLI for the documented workflow.

## Review Notes
The corrected example remains a minimal illustrative policy. In real clusters, DNS egress should usually target the actual DNS service or pods used by the cluster, and staged policy impact visibility depends on the Calico features installed for flow logs and Whisker.
