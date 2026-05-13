# Validation Summary: How to Configure Staged GlobalNetworkPolicy in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico StagedGlobalNetworkPolicy
- Calico staged network policies
- kubectl
- Calico Whisker flow logs

## Sources Consulted
- Calico staged network policies documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico StagedGlobalNetworkPolicy resource reference: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico Open Source 3.30 release notes: https://docs.tigera.io/calico/3.30/release-notes/
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Whisker flow logs documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs

## Issues Found
- The core YAML used `kind: NetworkPolicy` with a namespace even though the post is about `StagedGlobalNetworkPolicy`. Changed the YAML to `kind: StagedGlobalNetworkPolicy`, removed `metadata.namespace`, and added `namespaceSelector` to target the production namespace.
- The prerequisites stated Calico v3.26+ for staged global policy support. Updated this to Calico v3.30+, matching the Calico Open Source release generation where staged policy support is documented.
- The prerequisites required `calicoctl`, but the corrected staged policy workflow uses `kubectl` against Kubernetes custom resources. Removed the unnecessary `calicoctl` prerequisite.
- The introduction described staged global policies as enforcing security controls through `GlobalNetworkPolicy` and `NetworkPolicy`. Updated it to describe preview behavior and the staged resource kinds.
- The implementation and operational commands used `calicoctl` against `networkpolicy` and `globalnetworkpolicy` resources. Updated them to use `kubectl` with `stagedglobalnetworkpolicy` and `stagednetworkpolicy`, matching the official staged policy workflow and resource aliases.
- The post implied staged policies are active enforcement policies and suggested testing connectivity as enforcement validation. Updated the wording to describe traffic generation and preview behavior because staged policies preview policy impact without changing traffic flow.
- The metrics example checked Felix deny counters. Updated the verification step to use Calico Whisker flow logs, where staged policy impact is documented through pending policy information.
- The architecture diagram showed Felix enforcing the staged policy and traffic being blocked. Updated it to show preview evaluation and Calico Whisker flow logs instead of enforcement.
- The troubleshooting section recommended `calicoctl apply --dry-run`, which is not documented for `calicoctl apply`. Replaced it with `kubectl apply --dry-run=server -f ...`.

## Review Notes
The corrected examples are now aligned with the current Calico staged policy model. A future improvement would be to add a separate enforcing `GlobalNetworkPolicy` example that is applied only after staged policy impact has been reviewed.
