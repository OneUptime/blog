# Validation Summary: How to Use Namespace-Scoped Applications in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Applications
- Argo CD AppProjects
- Argo CD CLI, UI, and REST API
- Argo CD Notifications
- Argo CD ApplicationSet
- Kubernetes namespaces, RBAC, ConfigMaps, ResourceQuotas, and finalizers
- GitOps deployment workflows

## Sources Consulted
- Argo CD Applications in any namespace documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_list/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD ApplicationSet in any namespace documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/applicationset/Appset-Any-Namespace/
- Argo CD Notifications overview and namespace-based configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The setup omitted that Applications in any namespace require a cluster-scoped Argo CD installation. Added this prerequisite because the feature does not work with namespace-scoped Argo CD installations.
- The setup did not mention the extra `argocd-server` Kubernetes RBAC needed for CLI, UI, and API management of applications outside the control plane namespace. Added the upstream RBAC step.
- The namespace labels were described as required, but Argo CD does not require those labels for Applications in any namespace. Changed the wording to describe them as optional team labels.
- The sample AppProject allowed `team-a-*` destinations but the meta-application deploys Application resources into `team-a`. Added `team-a` as an allowed destination namespace so the example is internally consistent.
- The Kubernetes RBAC example granted `applicationsets` permissions without mentioning that ApplicationSets in non-control-plane namespaces need separate controller configuration. Added a short caveat.
- The Notifications section implied namespace-scoped notifications work without extra controller setup. Added the requirement to configure notification application namespaces and enable self-service notifications.

## Review Notes
The Argo CD CLI `--app-namespace` examples, `namespace/name` application references, AppProject `sourceNamespaces`, REST API `appNamespace` query parameter, Application manifest fields, Kubernetes RBAC resources, and ResourceQuota object-count syntax are consistent with the referenced documentation.
