# Validation Summary: Zero Trust with Staged Network Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Calico staged network policy resources
- Kubernetes custom resources
- kubectl
- Calico flow logs and Whisker

## Sources Consulted
- Calico staged network policy guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico StagedNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico StagedGlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico network policy guide: https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy

## Issues Found
- The post described staged policies but used `kind: NetworkPolicy`, which is an enforcing Calico policy resource. Changed the example to `kind: StagedNetworkPolicy` so it matches the staged policy API.
- The introduction claimed staged policy support through `GlobalNetworkPolicy` and `NetworkPolicy`. Changed this to `StagedGlobalNetworkPolicy`, `StagedNetworkPolicy`, and `StagedKubernetesNetworkPolicy`.
- The implementation used `calicoctl apply/get/delete` for staged policy resources. Current Calico documentation describes staged resources as Kubernetes custom resources managed with `kubectl`, and the current `calicoctl` resource list does not include staged policy resource types. Updated the commands to use `kubectl`.
- The post implied staged policies enforce traffic and create default-deny behavior. Calico staged policies preview policy impact without enforcing traffic. Updated the text, commands, and architecture diagram to describe preview behavior and enforcement via an equivalent enforcing policy after validation.
- The metrics command searched for `felix_denied`, which is not listed in the Felix Prometheus metrics reference and is not the documented way to preview staged policy impact. Replaced it with guidance to inspect the `policies.pending` field in Calico flow logs through Whisker.
- The prerequisites repeated an unverified version-specific requirement. Replaced it with the requirement that Calico staged policy CRDs and flow logs be available.
- The dry-run troubleshooting command used an unsupported `calicoctl apply --dry-run` form. Replaced it with `kubectl apply --dry-run=server -f zero-trust-staged-policies.yaml`.

## Review Notes
The corrected post is now technically accurate for Calico's staged policy model: staged policies preview the impact of policy decisions, while actual zero trust enforcement requires creating the equivalent `NetworkPolicy` or `GlobalNetworkPolicy` after validation.
