# Validation Summary: How to Order Namespace Creation Before Other Resources in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Sync waves
- Kubernetes Namespace, Deployment, Service, ResourceQuota, LimitRange, and RoleBinding resources
- kubectl and argocd CLI commands

## Sources Consulted
- Argo CD official sync waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD official sync options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD official `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD official `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Kubernetes official namespaces documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces/
- Kubernetes official ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes official RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The original post said ArgoCD applies all resources in the same wave together and that Namespace and Deployment resources in wave 0 have no guaranteed ordering. Argo CD documentation says resources are ordered by phase, wave, kind, and name, with namespaces ordered before other Kubernetes resources. Updated the explanation and diagram to describe the official ordering while preserving the recommendation to use earlier waves for explicit namespace setup.
- The ResourceQuota and LimitRange section said those resources should be in the same wave as the namespace, but the example correctly placed them in the next wave. Updated the prose to say they should be in the next wave after the namespace because they are namespaced resources.
- The debugging command used `argocd app resources payments-app --output json`, but current Argo CD documentation lists `argocd app resources` output as `tree` or `tree=detailed`, not JSON. Replaced it with `argocd app get payments-app --output tree=detailed`, which is supported by the official command reference.
- The cross-application dependency note suggested sync hooks as a remedy. Since sync waves and hooks operate within an application's sync flow and do not directly solve independent cross-application ordering, revised the guidance to recommend restructuring so namespace bootstrap completes before workload sync.

## Review Notes
The Kubernetes YAML examples use current stable API versions and valid fields. `CreateNamespace=true`, `Prune=false`, negative sync waves, and RoleBinding to a ClusterRole are all supported patterns in the official documentation.
