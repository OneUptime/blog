# Validation Summary: How to Handle Node Drain and Pod Disruption with Flux

## Status
validated

## Post Type
Tutorial / operational guide

## Technologies Covered
- Kubernetes
- kubectl
- PodDisruptionBudget
- Kubernetes node cordon, drain, and uncordon workflows
- Flux CD v2
- Flux Kustomizations
- GitOps
- jq

## Sources Consulted
- Kubernetes documentation: Safely Drain a Node - https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Kubernetes kubectl reference: kubectl drain - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes documentation: Specifying a Disruption Budget for your Application - https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Flux documentation: Kustomization - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI documentation: flux get kustomizations - https://fluxcd.io/flux/cmd/flux_get_kustomizations/
- Flux CLI documentation: flux reconcile kustomization - https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI documentation: flux suspend kustomization - https://fluxcd.io/flux/cmd/flux_suspend_kustomization/

## Issues Found
- The post claimed the workflow avoids triggering unwanted Flux reconciliations. Flux continues normal reconciliation on its interval or when manually triggered, so the description was changed to avoid implying drains suppress or trigger special Flux behavior.
- The introduction said PDBs may conflict with Flux-managed replica counts and that the drain must be sequenced with Flux's reconciliation loop. This was narrowed to the concrete issue: restrictive PDBs can block Kubernetes evictions, and drains should start from a healthy GitOps state.
- The prerequisite "At least N+1 nodes available" was too imprecise. It was replaced with a requirement for enough schedulable capacity on other nodes for evicted pods.
- The command comparing Deployment names to PDB names could falsely report missing PDBs because PDBs select pods by label and do not need to share a Deployment name. The text now identifies it as a heuristic and tells readers to review selectors.
- The pre-drain preparation text said Flux reconciles the target node's pods. Flux reconciles declared resources and can health-check workloads; it does not reconcile pods by node. The wording was corrected.
- The Flux readiness checks used `grep "False"` against CLI output. These were changed to Flux's documented `--status-selector ready=false` flag.
- The multiline `kubectl drain` command placed inline comments after line-continuation backslashes, which would break shell syntax. Comments were moved to separate lines and the command was split into a standard drain example plus an optional label-selector example.
- The Flux drain-monitoring explanation overstated that Flux detects pod disruptions and waits for deployments to stabilize. The wording now says Flux may run configured health checks if reconciliation occurs during the drain.
- The Deployment readiness check compared the wrong default `kubectl get deployments` columns. It now uses JSON output and compares `.status.readyReplicas` with `.spec.replicas`.
- The stuck-drain command attempted to remove DaemonSet pods with `grep -v DaemonSet`, but `kubectl get pods -o wide` does not show owner kind. It now reads owner references from JSON with `jq`.
- The retry command for a restrictive PDB used `--force`, which does not bypass PDB checks; Kubernetes documents `--force` for pods without a controller. The retry now uses the normal drain flags after scaling.

## Review Notes
The post is technically relevant and accurate after edits. The optional `--pod-selector='app.kubernetes.io/managed-by notin (flux)'` example is syntactically valid as a Kubernetes label selector, but readers should adapt it to labels actually present in their cluster.
