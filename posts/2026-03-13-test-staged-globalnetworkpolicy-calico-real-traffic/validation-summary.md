# Validation Summary: How to Test Staged GlobalNetworkPolicy in Calico with Real Traffic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico StagedGlobalNetworkPolicy
- Calico projectcalico.org/v3 API
- kubectl
- Felix and Calico flow logs

## Sources Consulted
- Calico documentation: Staged global network policy, https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico documentation: Stage, preview impacts, and enforce policy, https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico documentation: Staged network policy, https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico documentation: calicoctl get, https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl apply, https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring Felix with Prometheus, https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Tigera technical blog: Dry Run: Your Kubernetes network policies with Calico staged network policies, https://www.tigera.io/blog/dry-run-your-kubernetes-network-policies-with-calico-staged-network-policies/

## Issues Found
- The core YAML used `kind: NetworkPolicy` with a namespace, which creates a namespaced Calico policy rather than a `StagedGlobalNetworkPolicy`. Changed it to `kind: StagedGlobalNetworkPolicy`, removed the namespace, added `tier: default`, and selected the `production` namespace with the Calico namespace label.
- The post said staged policies provide security controls without clarifying that they do not enforce traffic. Updated the introduction, architecture, and conclusion to state that staged policies preview decisions and require an equivalent enforcing policy when ready.
- The prerequisites listed Calico v3.26+, but Calico Open Source staged network policies were introduced in v3.30. Updated the prerequisite and version-specific claim to v3.30+.
- The commands used `calicoctl` for staged policy resources and included `calicoctl apply --dry-run`, but the official staged policy workflow uses `kubectl`, and `calicoctl apply` documentation does not include a dry-run option. Replaced the apply, get, delete, and dry-run commands with `kubectl` equivalents.
- The metrics command searched for `felix_denied`, which is not a documented Felix metric in the Calico Open Source Felix metrics reference. Replaced it with guidance to inspect staged policy decisions in flow logs through the `policies.pending` field.
- The selector troubleshooting command used an abstract selector that could be confused with Calico selector syntax. Changed it to a concrete Kubernetes label selector for the example label.

## Review Notes
The corrected post now describes previewing real traffic decisions rather than enforcing or blocking that traffic. Future improvements could include a concrete example of retrieving Calico flow logs from the specific observability setup used by the cluster.
