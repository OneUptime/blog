# Validation Summary: How to Log and Audit Staged GlobalNetworkPolicy in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico `projectcalico.org/v3` APIs
- `StagedGlobalNetworkPolicy`
- `kubectl`
- Calico Whisker flow logs

## Sources Consulted
- Calico staged network policies documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico StagedGlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico log rules documentation: https://docs.tigera.io/calico/latest/network-policy/policy-rules/log-rules
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Tigera Calico 3.30 announcement: https://www.tigera.io/blog/introducing-calico-3-30-a-new-era-of-open-source-network-security-and-observability-for-kubernetes/

## Issues Found
- The sample policy used `kind: NetworkPolicy` with a namespace, but the post is about `StagedGlobalNetworkPolicy`, which is cluster-scoped. Changed the YAML to `kind: StagedGlobalNetworkPolicy`, removed `metadata.namespace`, and added a `namespaceSelector` to target the `production` namespace.
- The prerequisites stated Calico v3.26+ for Staged GlobalNetworkPolicy support. Updated this to Calico v3.30+ for Calico Open Source staged policy support.
- The post described staged policies as active enforcement. Updated wording to clarify that staged policies preview what would happen before enforcement.
- The implementation used `calicoctl apply` and `calicoctl get networkpolicies`; current Calico staged policy documentation shows applying staged policy custom resources with `kubectl`, and the resource is `stagedglobalnetworkpolicy`. Updated apply, get, describe, and delete commands accordingly.
- The prerequisites required `calicoctl`, but the corrected staged-policy workflow uses `kubectl`. Removed the unnecessary `calicoctl` prerequisite.
- The troubleshooting command used `calicoctl apply --dry-run`, which is not listed in the official `calicoctl apply` options. Replaced it with `kubectl apply --dry-run=server`.
- The monitoring example checked `felix_denied`, which is not listed as an official Felix metric in the Calico Open Source Felix metrics reference. Replaced it with guidance to review `policies.pending` in Calico Whisker flow logs for staged policy impact.
- The architecture diagram said Felix enforces the staged policy and Prometheus shows policy hit counters. Updated it to describe preview evaluation and Whisker flow-log review.

## Review Notes
The corrected post now focuses on staged policy preview and audit behavior. Actual packet logging with `action: Log` is documented for enforced Calico `NetworkPolicy` and `GlobalNetworkPolicy`; staged policy impact is reviewed through Whisker flow logs, especially the `policies.pending` field.
