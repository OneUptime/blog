# Validation Summary: Common Mistakes to Avoid with Staged Network Policies in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico staged network policies
- Kubernetes
- `kubectl`
- Calico Whisker and Goldmane flow logs
- YAML configuration

## Sources Consulted
- Calico staged network policy guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico `StagedNetworkPolicy` resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico `StagedGlobalNetworkPolicy` resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico `StagedKubernetesNetworkPolicy` resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico Whisker flow logs documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The YAML example used `kind: NetworkPolicy`, which creates an enforced Calico policy rather than a staged policy. Changed it to `kind: StagedNetworkPolicy` and added `tier: default` to match Calico staged policy examples.
- The introduction said staged policies are provided through `GlobalNetworkPolicy` and `NetworkPolicy`. Updated it to the staged resources: `StagedGlobalNetworkPolicy`, `StagedNetworkPolicy`, and `StagedKubernetesNetworkPolicy`.
- The commands used `calicoctl` to apply and inspect staged resources. Calico's staged policy guide applies these custom resources with `kubectl`, so the commands now use `kubectl`.
- The post described staged policies as active enforcement and referenced Felix deny metrics. Staged policies preview behavior without changing traffic flow, so the implementation steps and architecture now point to Calico Whisker flow logs and the `policies.pending` preview field.
- The dry-run command used `calicoctl apply --dry-run`, which is not shown as a supported `calicoctl apply` flag in current Calico docs. Replaced it with `kubectl apply --dry-run=server -f ...`.
- The ingress rule matched destination ports without explicitly setting TCP. Added `protocol: TCP` to make the application port rule unambiguous.
- The DNS troubleshooting note only mentioned port 53 generally. Updated it to note TCP and UDP port 53 when converting staged egress policy into enforced policy.

## Review Notes
Calico Whisker and Goldmane flow logs are documented as a tech preview feature in Calico Open Source. The post now notes the Calico v3.30+ Whisker/Goldmane requirement for the flow-log preview workflow.
