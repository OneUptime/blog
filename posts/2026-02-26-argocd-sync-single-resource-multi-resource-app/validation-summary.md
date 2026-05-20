# Validation Summary: How to Sync a Single Resource in a Multi-Resource ArgoCD Application

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD CLI
- Kubernetes
- GitOps
- Kubernetes RBAC
- kubectl rollout commands

## Sources Consulted
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD selective sync documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/selective_sync/
- Argo CD `argocd app diff` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_diff/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Kubernetes authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- `argocd app diff my-large-app --resource ...` was incorrect because current Argo CD CLI documentation for `app diff` does not include a `--resource` flag. Changed the example to run `argocd app diff my-large-app` and clarified that the reviewer should inspect the target resource section.
- `argocd app resources --output json` was incorrect because current `app resources` output is limited to tree formats. Changed JSON inspection examples to use `argocd app get --output json` and query `.status.resources[]`.
- The namespace examples used an unsupported `--namespace` flag for `argocd app sync`. Changed them to Argo CD's documented resource selector format with `namespace/name`, such as `apps:Deployment:staging/web-server`.
- The post claimed a single-resource sync involves only one Kubernetes API call. Reworded this to say Argo CD limits the operation to the selected resource rather than applying the entire application.
- Added the documented selective sync caveats that selective syncs are not recorded in application history and sync hooks are not run.
- The RBAC section implied running pods need token expiry or restart before RBAC changes apply. Reworded this to align with Kubernetes authorization behavior: future API requests are evaluated by the API server using the updated RBAC policy for the same service account identity.
- The Ingress section described targeted Ingress sync as low-risk/safe. Reworded this to note that Ingress changes do not restart workloads but can affect traffic routing immediately.

## Review Notes
The post is technically relevant and remains accurate after the corrections. The Argo CD resource selector examples now match the documented `GROUP:KIND:NAME` and `GROUP:KIND:NAMESPACE/NAME` formats.
