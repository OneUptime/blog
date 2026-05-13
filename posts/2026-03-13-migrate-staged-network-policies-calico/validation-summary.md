# Validation Summary: How to Migrate to Staged Network Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico staged network policies
- Calico `projectcalico.org/v3` API
- `kubectl`
- Calico Whisker flow logs

## Sources Consulted
- Calico documentation: Stage, preview impacts, and enforce policy: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico documentation: Staged network policy resource: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico documentation: Staged Kubernetes network policy resource: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico documentation: `calicoctl apply`: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico 3.30 release notes: https://docs.tigera.io/calico/3.30/release-notes/

## Issues Found
- The post used `kind: NetworkPolicy` for a staged policy example. Changed it to `kind: StagedNetworkPolicy` because Calico staged policies are separate resources and non-staged `NetworkPolicy` is enforcing.
- The post claimed staged policy support for Calico v3.26+. Updated prerequisites to Calico v3.30+ because Calico 3.30 introduced staged policy CRDs.
- The post described staged policies as enforced through `GlobalNetworkPolicy` and `NetworkPolicy`. Updated the explanation to refer to `StagedGlobalNetworkPolicy`, `StagedNetworkPolicy`, and related staged resources.
- The commands used `calicoctl` resource operations for staged policies. Replaced them with documented `kubectl` commands and staged policy resource aliases such as `stagednetworkpolicy.p`.
- The verification step implied the policy would be active and enforced. Updated it to verify that the policy is staged and to clarify that connectivity tests confirm baseline behavior while staged policies remain non-enforcing.
- The metrics step referenced Felix deny counters as policy hit counters. Replaced it with Calico Whisker flow-log preview guidance using the `policies.pending` field, as documented for staged policy impact.
- The architecture diagram showed staged policies enforcing traffic and default-denying packets. Updated it to describe "would allow" and "would deny" preview behavior.
- The troubleshooting guidance used `calicoctl apply --dry-run`, which is not documented in the `calicoctl apply` help output. Replaced it with `kubectl apply --dry-run=server -f`.
- The selector troubleshooting command used Calico selector syntax directly with `kubectl -l`. Updated it to show the equivalent Kubernetes label selector syntax.
- The DNS troubleshooting note implied immediate staged-policy enforcement. Updated it to apply to the equivalent enforcing policy after staged validation.

## Review Notes
The corrected post now accurately distinguishes preview-only staged policy resources from enforcing Calico policy resources. A future improvement would be to add a short example of applying the equivalent enforcing policy after reviewing the staged policy impact, but no new section was added to keep the fix scoped to technical corrections.
