# Validation Summary: Automating Cilium Agent Hive Dot-Graph Collection and Rendering

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium agent Hive command
- Kubernetes CronJob, RBAC, ServiceAccount, and PersistentVolumeClaim resources
- kubectl
- Graphviz DOT rendering
- GitHub Actions
- Bash shell scripting

## Sources Consulted
- Cilium command reference for `cilium-agent hive dot-graph`: https://docs.cilium.io/en/stable/cmdref/cilium-agent_hive_dot-graph.html
- Cilium v1.14 generated command reference in the official Cilium repository: https://raw.githubusercontent.com/cilium/cilium/v1.14.0/Documentation/cmdref/cilium-agent_hive_dot-graph.md
- Cilium Helm chart ClusterRole for the `cilium` service account: https://raw.githubusercontent.com/cilium/cilium/v1.19.3/install/kubernetes/cilium/templates/cilium-agent/clusterrole.yaml
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Graphviz command-line documentation: https://graphviz.org/doc/info/command.html
- Azure setup-kubectl action README: https://github.com/Azure/setup-kubectl
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions
- actions/upload-artifact README: https://github.com/actions/upload-artifact

## Issues Found
- The CronJob example used `serviceAccountName: cilium`. The standard Cilium service account can read pods, but it does not grant `create` on the `pods/exec` subresource, which is required for `kubectl exec`. I changed the manifest to use a dedicated `hive-graph-collector` service account with a namespace-scoped Role granting `get`/`list` on pods and `create` on `pods/exec`.
- The CronJob referenced `claimName: hive-graph-storage` without defining the PVC. I added a minimal `PersistentVolumeClaim` so the example is deployable as shown in clusters with a default StorageClass.
- The GitHub Actions example used `azure/setup-kubectl@v3`; the action README currently documents `azure/setup-kubectl@v4`. I updated the workflow to `@v4`.

## Review Notes
- The `cilium-agent hive dot-graph` command is present in the Cilium v1.14 generated command reference and current stable Cilium documentation.
- The Graphviz `dot -Tsvg` and `dot -Tpng` render commands match the documented command-line format.
- The node and edge comparison scripts use simple `grep` heuristics against DOT output. That is acceptable for a lightweight monitor, but a future revision could use a DOT parser if the output format needs robust semantic comparison.
