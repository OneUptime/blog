# Validation Summary: How to Test Staged Kubernetes NetworkPolicy in Calico with Real Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico staged network policies
- Calico `StagedKubernetesNetworkPolicy`
- Kubernetes NetworkPolicy
- `kubectl`
- Calico Whisker flow logs

## Sources Consulted
- Calico staged Kubernetes network policy reference: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico stage, preview, and enforce policy guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico network policy resource reference: https://docs.tigera.io/calico/latest/reference/resources/networkpolicy
- Calico `calicoctl` user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- The main YAML example used `kind: NetworkPolicy` with Calico selector-based policy fields (`selector`, `types`, `action`, `source`, `destination`) while the post described Staged Kubernetes NetworkPolicy. Changed it to `kind: StagedKubernetesNetworkPolicy` and Kubernetes NetworkPolicy-style fields (`podSelector`, `policyTypes`, `from`, `to`, `ports`).
- The commands applied and inspected an enforced Calico `NetworkPolicy` with `calicoctl`. Changed them to use `kubectl` against the documented staged Kubernetes policy resource aliases.
- The traffic test implied staged policies actively block traffic and suggested checking `felix_denied` metrics. Updated the text to clarify that staged policies preview impact without enforcing traffic and that impact is reviewed in Calico flow logs, such as `policies.pending` in Whisker.
- The architecture diagram said Felix enforces the staged policy and that traffic is blocked by default deny. Updated it to show staged evaluation and previewed allow/deny outcomes.
- The common issues and conclusion referred to policy order conflicts and enforcement behavior that do not apply to Kubernetes-style staged policies. Updated them to focus on staged policy kind, dry-run validation, selector matching, preview behavior, and DNS allowances after enforcement.
- The prerequisites hard-coded Calico v3.26+ as full staged policy support. Replaced that with the operational requirement that the `StagedKubernetesNetworkPolicy` CRD is installed.

## Review Notes
The corrected guide is documentation-based. I did not run these commands against a live Calico cluster, so server-side validation depends on the target cluster having the Calico staged policy CRDs installed.
