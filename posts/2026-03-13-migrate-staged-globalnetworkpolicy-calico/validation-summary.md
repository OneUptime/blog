# Validation Summary: How to Migrate to Staged GlobalNetworkPolicy in Calico

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico StagedGlobalNetworkPolicy
- Calico GlobalNetworkPolicy
- kubectl
- Calico Whisker and Goldmane flow logs

## Sources Consulted
- Calico Staged Global Network Policy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico Stage, preview impacts, and enforce policy documentation: https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico Global Network Policy resource documentation: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico calicoctl user reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview
- Calico calicoctl apply reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico Whisker flow logs documentation: https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Calico Enable flow logs documentation: https://docs.tigera.io/calico/latest/observability/enable-whisker

## Issues Found
- The core YAML used `kind: NetworkPolicy` with a namespace even though the post is about `StagedGlobalNetworkPolicy`. Changed it to `kind: StagedGlobalNetworkPolicy`, removed the namespace metadata, and scoped it to the production namespace with the Calico global-policy selector pattern.
- The post implied staged policies actively enforce allow/deny behavior. Updated the introduction, implementation comments, architecture diagram, and conclusion to state that staged policies preview behavior and require an equivalent enforcing policy when ready.
- The commands used `calicoctl` for staged policy resources, but current Calico staged policy documentation applies and inspects these custom resources with `kubectl`, and the calicoctl resource list does not include staged policy kinds. Replaced those commands with `kubectl` equivalents.
- The dry-run command used `calicoctl apply --dry-run`, which is not listed in the official calicoctl apply options. Replaced it with `kubectl apply --dry-run=server`.
- The monitoring command checked `felix_denied` metrics, which does not match the current staged-policy preview workflow. Replaced it with the Calico Whisker flow-log preview path.
- The prerequisites pinned Calico v3.26+ for full staged policy support and required `calicoctl`, neither of which was supported by the current official docs reviewed. Updated prerequisites to require the staged policy CRD, `kubectl`, and Whisker/Goldmane when using flow-log previews.

## Review Notes
The YAML was reviewed for Calico API shape against the official resource documentation. Local YAML parser validation could not be run because Ruby was not installed in the workspace.
