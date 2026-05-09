# Validation Summary: Testing Typha High Availability in Calico the Hard Way

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Typha
- Calico Felix
- Calico GlobalNetworkPolicy
- Kubernetes Deployments
- Kubernetes PodDisruptionBudget
- kubectl
- calicoctl
- Prometheus metrics

## Sources Consulted
- Calico Typha configuration reference: https://docs.tigera.io/calico/latest/reference/typha/configuration
- Calico Typha Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/typha/prometheus
- Calico component metrics documentation: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico hard-way Typha installation guide: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/install-typha
- Kubernetes kubectl drain reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes disruptions and PodDisruptionBudget documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Calico calicoctl command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/overview

## Issues Found
- The post assumed Typha metrics were available on port `9093`. Calico's Typha metrics port defaults to `9091`, while `9093` is used in some configurations such as Amazon YAML/operator examples. I added a prerequisite for enabled Typha metrics and changed the commands to use `TYPHA_METRICS_PORT="${TYPHA_METRICS_PORT:-9091}"`.
- The pod-crash section said `calicoctl get globalnetworkpolicy` verified Felix could read policies. That command verifies the Calico API/datastore can return the policy, not Felix's local sync state. I corrected the wording and pass criteria to require Felix log confirmation for reconnect/sync behavior.
- The node-drain section said the PDB prevents eviction of more than one pod during a single-node drain and that only two Typha pods should remain after the drain. A drain respects PDBs through the eviction API, but with one Typha pod on the drained node, the eviction is allowed and the Deployment should create a replacement. I updated the comments and pass criteria to describe the correct behavior.
- The description and introduction mentioned zone-level failures, but the post does not include a zone-failure test. I revised those statements to match the actual scenarios covered.
- The conclusion claimed the tests exercise every HA mechanism. I softened that to "the main HA mechanisms" because the post does not cover every possible HA failure mode, such as a full availability-zone outage.

## Review Notes
The commands are generally appropriate for a controlled staging or production validation run, but the policy examples only validate resource availability unless paired with workload traffic tests and Felix log/metric checks. Future revisions could add concrete workload probes for end-to-end policy enforcement continuity.
