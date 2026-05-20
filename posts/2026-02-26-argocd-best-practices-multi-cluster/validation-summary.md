# Validation Summary: ArgoCD Best Practices for Multi-Cluster Management

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo CD ApplicationSets
- Kubernetes
- Kubernetes RBAC
- Kustomize
- Prometheus Operator
- Terraform for AWS EKS
- Bash and jq

## Sources Consulted
- Argo CD cluster generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD merge generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Merge/
- Argo CD matrix generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Matrix/
- Argo CD ApplicationSet specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Argo CD Kustomize documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/kustomize/
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD cluster rm command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_rm/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/metrics/
- Argo CD cluster metrics source code: https://github.com/argoproj/argo-cd/blob/master/controller/metrics/clustercollector.go
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes deprecated API migration guide: https://kubernetes.io/docs/reference/using-api/deprecation-guide/

## Issues Found
- The dedicated `argocd-manager` service account example created a `ClusterRole` but did not bind it to the service account. Added a `ClusterRoleBinding` so the service account actually receives the intended permissions.
- The cluster registration example for the dedicated service account did not tell `argocd cluster add` to use that account. Added `--service-account argocd-manager` to align the command with the preceding RBAC setup.
- The workload RBAC example included the old `extensions` API group for Deployments, DaemonSets, and ReplicaSets. Removed it because those workload APIs have been served from `apps/v1` for current Kubernetes releases.
- The Prometheus alert used `argocd_cluster_info{connection_status!="Successful"}`, but current Argo CD exposes connectivity via `argocd_cluster_connection_status`; `argocd_cluster_info` only carries cluster identity/version information. Updated the alert to use `argocd_cluster_connection_status == 0`.
- The active-active ApplicationSet snippet omitted required/expected Application source fields. Added `project`, `repoURL`, and `targetRevision` to make the example a complete Argo CD Application template.

## Review Notes
The ApplicationSet examples use the older default template syntax such as `{{name}}` and `{{server}}`. This is still supported when `goTemplate: true` is not enabled, while the latest Argo CD documentation often shows Go template syntax such as `{{.name}}`. The post could mention this distinction in the future, but the current examples are technically valid.
