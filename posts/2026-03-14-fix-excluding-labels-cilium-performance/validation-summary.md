# Validation Summary: Fixing Excluding Labels in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- kubectl
- jq
- iperf3

## Sources Consulted
- Cilium documentation: Limiting Identity-Relevant Labels, https://docs.cilium.io/en/stable/operations/performance/scalability/identity-relevant-labels/
- Cilium documentation: cilium-dbg identity list, https://docs.cilium.io/en/stable/cmdref/cilium-dbg_identity_list/
- Cilium documentation: cilium-dbg monitor, https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium documentation: cilium-dbg endpoint list, https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium documentation: cilium config view, https://docs.cilium.io/en/latest/cmdref/cilium_config_view/
- Kubernetes kubectl reference, https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes documentation: Safely Drain a Node, https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Helm documentation: helm upgrade, https://helm.sh/docs/helm/helm_upgrade/
- Helm documentation: helm rollback, https://helm.sh/docs/helm/helm_rollback/

## Issues Found
- The exclusion examples used `k8s:!label-name`, but Cilium's documented identity-relevant label configuration uses label-key regex patterns such as `!label-name`. Updated the Helm example and troubleshooting note.
- The post used `pod-template-hash`, `controller-revision-hash`, and `pod-template-generation` as labels to manually exclude, but current Cilium releases already exclude those by default. Updated the examples to use custom high-cardinality labels such as build IDs, release timestamps, and Git SHAs.
- The include-list example used source-prefixed labels such as `k8s:app`, which are not the documented syntax for the `labels` Helm value. Replaced it with the documented include pattern format.
- The verification examples used `cilium identity list`, `cilium monitor`, and `cilium endpoint list`, but current Cilium command documentation exposes these daemon commands as `cilium-dbg` subcommands. Updated those examples to run `cilium-dbg` through the Cilium DaemonSet with `kubectl exec`.
- The jq discovery script failed on pods without labels because `to_entries[]` was applied to null. Added a default empty object so the script handles unlabeled pods.
- The conclusion claimed a typical 50% or greater reduction from excluding labels that are already default-excluded in current Cilium. Reworded this to a more accurate cluster-dependent impact statement.

## Review Notes
The post is technically relevant and has been corrected for current Cilium documentation. The operational commands still assume the default `kube-system` namespace, the default Cilium DaemonSet name, and GNU `timeout`; clusters with custom deployments may need minor command adjustments.
