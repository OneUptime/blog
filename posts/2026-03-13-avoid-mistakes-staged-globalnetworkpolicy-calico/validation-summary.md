# Validation Summary: Common Mistakes to Avoid with Staged GlobalNetworkPolicy in Calico

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- StagedGlobalNetworkPolicy
- GlobalNetworkPolicy
- kubectl
- Calico Whisker flow logs

## Sources Consulted
- Calico documentation: Staged global network policy, https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico documentation: Stage, preview impacts, and enforce policy, https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico documentation: calicoctl apply, https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: View flow logs, https://docs.tigera.io/calico/latest/observability/view-flow-logs
- Tigera blog: Calico 3.30 new open source networking and security features, https://www.tigera.io/blog/introducing-calico-3-30-a-new-era-of-open-source-network-security-and-observability-for-kubernetes/

## Issues Found
- The YAML used `kind: NetworkPolicy` with a namespace, which is not a staged global policy. Changed it to non-namespaced `kind: StagedGlobalNetworkPolicy` and used `namespaceSelector` to scope the policy to the production namespace.
- The post described staged policy as enforced traffic control. Updated the wording, architecture diagram, and commands to make clear that staged policies preview behavior and do not enforce traffic.
- The commands used `calicoctl` for staged policy workflows. Current Calico staged policy documentation shows staged policy resources applied and queried with `kubectl`, so the apply, get, and delete examples were updated.
- The dry-run command used an unsupported `calicoctl apply --dry-run` pattern. Replaced it with `kubectl apply --dry-run=server`.
- The metrics example used `felix_denied`, which does not validate staged policy impact. Replaced it with guidance to check Calico Whisker flow logs and the `policies.pending` field.
- The prerequisites claimed Calico v3.26+ support. Updated the staged policy prerequisite to Calico v3.30+ based on Tigera's release information for the staged policy resources.
- The DNS egress guidance only mentioned port 53 generically. Updated the policy and common issue text to allow both UDP and TCP port 53.

## Review Notes
The post remains a high-level guide. In a future revision, it could include an example of creating the equivalent enforcing `GlobalNetworkPolicy` after staged validation succeeds.
