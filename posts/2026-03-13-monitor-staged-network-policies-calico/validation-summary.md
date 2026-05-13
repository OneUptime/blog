# Validation Summary: How to Monitor Staged Network Policies in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source network policy
- Calico staged network policy resources (`StagedNetworkPolicy`, `StagedGlobalNetworkPolicy`, `StagedKubernetesNetworkPolicy`)
- Kubernetes custom resources
- kubectl
- Calico flow logs and Whisker

## Sources Consulted
- Calico staged network policy guide: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico StagedNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico StagedGlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico calicoctl reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Whisker / flow logs guide: https://docs.tigera.io/calico/latest/observability/

## Issues Found
- The post described staged policies but the YAML used `kind: NetworkPolicy`, which is an enforcing Calico policy resource. Changed the example to `kind: StagedNetworkPolicy` so it matches the staged policy API.
- The introduction claimed staged policy support through `GlobalNetworkPolicy` and `NetworkPolicy`. Updated the resource list to `StagedGlobalNetworkPolicy`, `StagedNetworkPolicy`, and `StagedKubernetesNetworkPolicy`, which are the actual staged policy resources.
- Implementation and operational commands used `calicoctl apply/get/delete` for staged policy resources. Calico documentation describes staged resources as Kubernetes custom resources managed with `kubectl`, and `calicoctl` does not list staged policy resource types. Updated the commands to use `kubectl` against the staged policy CRDs.
- The post implied staged policies enforce traffic and could produce a default-deny outcome. Calico staged policies preview policy impact without enforcing traffic. Updated the introduction, implementation step descriptions, architecture diagram, and conclusion to describe preview behavior, with enforcement requiring an equivalent enforcing policy after validation.
- The metrics command searched for `felix_denied`, which is not listed in the Felix Prometheus metrics reference and is not the documented way to observe staged policy impact. Replaced it with guidance to inspect the `policies.pending` field in Calico flow logs through Whisker, and added a `kubectl port-forward` example for the Whisker service.
- The dry-run troubleshooting command used an unsupported `calicoctl apply --dry-run` form. Replaced it with `kubectl apply --dry-run=server -f monitor-staged-policies.yaml`.
- The "Order conflicts" troubleshooting command listed `globalnetworkpolicies`, which is not the staged resource. Replaced with `kubectl get stagednetworkpolicy.p --all-namespaces -o wide`.
- The prerequisites repeated an unverified version-specific requirement (Calico v3.26+ twice) and called for `calicoctl`. Replaced with the requirement that Calico staged policy CRDs and flow logs/Whisker be available, plus `kubectl`.
- Fixed the grammar issue "production-tested patterns for monitor Staged Policies" to "monitoring Staged Policies".

## Review Notes
The corrected post is now technically accurate for Calico's staged policy model: staged policies preview the impact of policy decisions without enforcing traffic, and actual enforcement requires creating the equivalent `NetworkPolicy` or `GlobalNetworkPolicy` after monitoring confirms the policy behaves as expected. The post still uses a generic "Staged Policies Policy" label in the mermaid diagram, which is awkward phrasing but technically accurate as a placeholder; left unchanged to preserve the author's wording.
