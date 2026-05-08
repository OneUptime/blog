# Validation Summary: How to Validate Staged Network Policies in Calico Before Production

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico staged network policy resources
- `kubectl`
- Felix / Whisker flow logs

## Sources Consulted
- Calico Open Source documentation: Stage, preview impacts, and enforce policy - https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico Open Source documentation: Staged network policy resource - https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico Open Source documentation: Staged global network policy resource - https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico Open Source documentation: calicoctl get command reference - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Open Source documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus

## Issues Found
- The post used `kind: NetworkPolicy`, which is an enforced Calico policy, while describing staged policy behavior. Changed it to `kind: StagedNetworkPolicy`.
- The introduction claimed staged policy support through enforced `GlobalNetworkPolicy` and `NetworkPolicy` resources. Updated the resource names to `StagedGlobalNetworkPolicy`, `StagedNetworkPolicy`, and `StagedKubernetesNetworkPolicy`.
- The command examples used `calicoctl get networkpolicies` and `calicoctl get globalnetworkpolicies`, which operate on enforced policies rather than staged policies. Replaced them with documented `kubectl` commands for `stagednetworkpolicy.p` and `stagedglobalnetworkpolicy.p`.
- The implementation described verifying that the policy was "active" and checking `felix_denied` policy hit counters. Staged policies do not enforce traffic; Calico documents preview impact through flow logs in the `policies.pending` field. Updated the workflow and architecture language to reflect preview/evaluation rather than enforcement.
- The troubleshooting section used `calicoctl apply --dry-run`, which is not the correct Kubernetes dry-run form for the patched `kubectl apply` workflow. Replaced it with `kubectl apply --dry-run=server -f validate-staged-policies.yaml`.
- The selector troubleshooting command used a placeholder selector that was not directly runnable with Kubernetes label selector syntax. Replaced it with a concrete `kubectl get pods -l app=authorized-source` example.
- The DNS troubleshooting note implied staged policies would directly cause DNS failures. Clarified that this applies after the staged policy is enforced.

## Review Notes
The post remains a concise staged-policy guide. Future improvements could add a concrete Whisker or flow-log query workflow, but that would be an enhancement rather than a correctness fix.
