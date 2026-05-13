# Validation Summary: How to Debug Staged Network Policies in Calico

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Calico Open Source, Calico Cloud, and Calico Enterprise staged network policy resources
- Kubernetes custom resources
- Calico `projectcalico.org/v3` API
- `kubectl`
- Felix Prometheus metrics

## Sources Consulted
- Calico documentation: Stage, preview impacts, and enforce policy - https://docs.tigera.io/calico/latest/network-policy/staged-network-policies
- Calico documentation: Staged network policy resource - https://docs.tigera.io/calico/latest/reference/resources/stagednetworkpolicy
- Calico documentation: Staged global network policy resource - https://docs.tigera.io/calico/latest/reference/resources/stagedglobalnetworkpolicy
- Calico documentation: Staged Kubernetes network policy resource - https://docs.tigera.io/calico/latest/reference/resources/stagedkubernetesnetworkpolicy
- Calico documentation: calicoctl get - https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico documentation: calicoctl apply - https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Tigera blog: Calico 3.30 feature announcement for open source staged policy CRDs - https://www.tigera.io/blog/introducing-calico-3-30-a-new-era-of-open-source-network-security-and-observability-for-kubernetes/

## Issues Found
- The post described staged policies as if they actively blocked traffic. Calico staged policy resources preview behavior without changing actual traffic flow, so the introduction, description, architecture diagram, implementation step, and conclusion were updated to describe previewed "would be blocked" behavior instead of enforcement.
- The YAML example used `kind: NetworkPolicy`, which creates an enforced Calico policy rather than a staged Calico policy. Changed it to `kind: StagedNetworkPolicy`.
- The post said staged policies are provided through `GlobalNetworkPolicy` and `NetworkPolicy`. Updated the resource names to `StagedGlobalNetworkPolicy`, `StagedNetworkPolicy`, and `StagedKubernetesNetworkPolicy`.
- The prerequisites claimed Calico v3.26+ had full staged policy support. For Calico Open Source, staged policy CRDs were introduced with v3.30, so the prerequisite now states Calico Open Source v3.30+ or a Calico Cloud/Enterprise version that includes the staged policy CRDs.
- The command examples used `calicoctl get/apply/delete networkpolicy` for staged policies. The current Calico staged policy resource documentation shows the staged CRDs and `kubectl` resource aliases, while the current `calicoctl` resource list does not include staged policy types. Commands were updated to use `kubectl` with `stagednetworkpolicies.projectcalico.org` and `stagedglobalnetworkpolicies.projectcalico.org`.
- The common-issues section recommended `calicoctl apply --dry-run`, but current `calicoctl apply` help does not list a dry-run flag. Changed the validation command to `kubectl apply --dry-run=server -f debug-staged-policies.yaml`.
- The metrics example grepped for `felix_denied`, which is not listed in the current Felix Prometheus metric reference. Replaced it with a neutral command that confirms Felix metrics exposure.
- The selector debugging command used an unspecified `kubectl -l your-selector` pattern even though Calico selector syntax differs from Kubernetes label selector syntax. Updated the example to a Kubernetes label selector and noted that the Calico selector syntax should be checked separately.

## Review Notes
Staged policy impact review usually depends on Calico flow logs, Whisker, or product-specific policy preview features. The post now avoids claiming a generic CLI hit-counter workflow for staged policy decisions.
