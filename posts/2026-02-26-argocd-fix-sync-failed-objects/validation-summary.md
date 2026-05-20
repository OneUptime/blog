# Validation Summary: How to Fix 'sync failed: one or more objects failed to apply' in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Kubernetes RBAC
- Kubernetes ResourceQuota
- Kubernetes admission webhooks
- Kubernetes CustomResourceDefinitions
- kubeconform

## Sources Consulted
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/
- Kubernetes Deployments documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Dynamic Admission Control documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- kubeconform project documentation: https://github.com/yannh/kubeconform

## Issues Found
- The post described `Replace=true` as deleting and recreating resources and presented it as a fix for immutable field changes. Argo CD documents `Replace=true` as `kubectl replace/create`; deletion and recreation is the destructive `Force=true,Replace=true` resource sync option. Updated the snippet and warning accordingly.
- The RBAC example showed a `ClusterRole` without a binding. Kubernetes RBAC roles grant permissions only when bound to subjects. Added a `ClusterRoleBinding` example and a note that a `Role` or `ClusterRole` must be bound to the Argo CD application controller service account.
- The namespace section implied `CreateNamespace=true` creates any resource namespace. Argo CD creates the Application `spec.destination.namespace`; manifests should omit `metadata.namespace` or match that destination. Added that caveat.
- The conflict section recommended force syncing for existing-resource conflicts. That can be destructive and is not the right general fix for shared ownership. Updated the guidance to use server-side apply for adoption or field-ownership cases, avoid multiple Argo CD Applications owning the same object, and refresh/retry for transient resource-version conflicts.
- The example resource table used `SyncFailed` as a resource status. Adjusted it to a more typical resource status/message pattern while preserving the troubleshooting intent.

## Review Notes
The guide is technically relevant and current. Some operational advice, such as broad wildcard RBAC, is intentionally simplified for troubleshooting; production use should prefer the more granular permissions shown immediately after it.
