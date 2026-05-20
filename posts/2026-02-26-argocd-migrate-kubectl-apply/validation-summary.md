# Validation Summary: How to Migrate from kubectl Apply to ArgoCD

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Kubernetes
- kubectl
- Argo CD
- GitOps
- Kubernetes RBAC
- yq
- kubectl-neat / Krew

## Sources Consulted
- Kubernetes kubectl diff reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_diff/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes kubectl api-resources reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_api-resources/
- Kubernetes kubectl rollout undo reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Kubernetes kubectl apply view-last-applied reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/kubectl_apply_view-last-applied/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Argo CD declarative setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD diff customization documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD app sync command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD app list command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- yq evaluate command documentation: https://mikefarah.gitbook.io/yq/commands/evaluate
- kubectl-neat Krew package page: https://artifacthub.io/packages/krew/krew-index/neat

## Issues Found
- The post described `kubectl get all -n production -o yaml` as exporting all resources in a namespace. Kubernetes `kubectl get all` covers a common grouped set, not every namespaced resource type. Changed the comment to "Export common workload resources from a namespace."
- The post said there is no rollback mechanism with `kubectl apply`. Kubernetes does provide rollout undo for supported workload rollouts, but ad hoc apply workflows do not provide a consistent Git-backed rollback across all manifests. Changed the wording to "No consistent rollback mechanism."
- The post said there is no access control with `kubectl apply`. Kubernetes RBAC can restrict direct cluster writes, but a direct-apply workflow can still have weak centralized deployment control if users have write access. Changed the wording to "Weak deployment access control."
- The cleanup script only removed runtime fields from a single object. It would not clean `items[]` entries in list output from commands such as `kubectl get deployments -o yaml`. Updated the yq expression to also remove common runtime fields from `.items[]`.
- The Argo CD Application example used `project: production` without creating or referencing an existing AppProject. Official Argo CD examples use the built-in `default` project for minimal Application manifests. Changed the example to `project: default`.

## Review Notes
- Local `kubectl` and `yq` binaries were not installed in the review environment, so command validation was performed against official command references.
- The internal OneUptime link to the Argo CD install guide points to a plausible existing post path in this repository.
- The RBAC example only defines a ClusterRole. In a real migration it must be paired with appropriate RoleBinding or ClusterRoleBinding changes and removal of existing write bindings.
