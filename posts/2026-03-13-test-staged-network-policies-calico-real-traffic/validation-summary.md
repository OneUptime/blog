# Validation Summary: How to Test Staged Network Policies in Calico with Real Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico staged network policy custom resources
- Calico Whisker flow logs
- kubectl

## Sources Consulted
- Calico staged network policy guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico StagedNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico Whisker flow logs documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply

## Issues Found
- The post used `kind: NetworkPolicy` for a staged policy example. Changed it to `kind: StagedNetworkPolicy` because Calico staged policies are distinct custom resources under `projectcalico.org/v3`.
- The introduction described staged policies as enforcing network security controls through `GlobalNetworkPolicy` and `NetworkPolicy`. Updated the wording to preview controls and reference `StagedGlobalNetworkPolicy`, `StagedNetworkPolicy`, and `StagedKubernetesNetworkPolicy`.
- The prerequisites claimed Calico v3.26+ support. Updated this to Calico v3.30+ and noted that Whisker and flow logs must be enabled, matching the currently documented staged policy and flow log workflow.
- The implementation and operational commands used `calicoctl` for staged resources. Replaced them with `kubectl` commands using the documented staged policy resource aliases.
- The traffic test implied that a staged policy would block traffic or that Felix deny metrics would validate the staged result. Updated it to generate real traffic and review the `policies.pending` field in Calico Whisker flow logs.
- The architecture diagram said Felix enforces staged policy and that default-denied traffic is blocked. Changed it to show pending deny behavior and flow log review, because staged policies preview impact without changing actual traffic flow.
- The dry-run troubleshooting command used a non-documented `calicoctl apply --dry-run` form. Replaced it with `kubectl apply --dry-run=server -f test-staged-policies.yaml`.

## Review Notes
The post now accurately describes staged policies as preview-only resources. A future improvement could add a concrete example of the Whisker `policies.pending` output, but that was outside this correction-only review.
