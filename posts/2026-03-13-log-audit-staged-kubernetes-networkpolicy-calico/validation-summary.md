# Validation Summary: How to Log and Audit Staged Kubernetes NetworkPolicy in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico staged network policy
- Kubernetes NetworkPolicy
- `kubectl`
- Calico Whisker flow logs

## Sources Consulted
- Calico staged Kubernetes network policy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico staged policy workflow documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico staged network policy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico `calicoctl apply` documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Kubernetes NetworkPolicy documentation: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The core YAML used `kind: NetworkPolicy` with Calico selector-based fields (`order`, `selector`, `action`, `source`, `destination`, `types`) even though the post is about Staged Kubernetes NetworkPolicy. Changed it to `kind: StagedKubernetesNetworkPolicy` and used the Kubernetes NetworkPolicy-shaped spec (`podSelector`, `policyTypes`, `from`, `to`, and `ports`) that Calico documents for this staged resource.
- The implementation and operational commands used `calicoctl` for staged Kubernetes policies. Calico documents staged policy application with `kubectl`, and `calicoctl apply` documentation does not list staged policy resources among valid resource types. Updated commands to use `kubectl` and the `stagedkubernetesnetworkpolicy.projectcalico.org` resource.
- The post described staged policies as active enforcement and referenced Felix denied metrics for hit counters. Calico staged policies preview behavior without changing traffic flow, and staged impact is reflected in Whisker flow logs through `policies.pending`. Updated the commands and architecture text accordingly.
- The troubleshooting guidance referenced `calicoctl apply --dry-run`, but the official `calicoctl apply` help does not document a dry-run flag. Replaced it with `kubectl apply --dry-run=server`.
- The prerequisites and conclusion still referenced `calicoctl`, Calico policy ordering, and a specific Calico version after the resource was corrected. Updated them to match the staged Kubernetes NetworkPolicy and flow log workflow.
- The DNS allow example only permitted UDP port 53. Added TCP port 53 because DNS can use TCP as well as UDP.

## Review Notes
The post now focuses specifically on Staged Kubernetes NetworkPolicy. If the goal is to demonstrate Calico-specific staged policies with `order`, Calico selectors, and `Log` actions, that should be a separate post using `StagedNetworkPolicy` or `StagedGlobalNetworkPolicy` rather than `StagedKubernetesNetworkPolicy`.
