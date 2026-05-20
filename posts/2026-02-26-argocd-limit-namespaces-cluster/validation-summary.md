# Validation Summary: How to Limit ArgoCD to Specific Namespaces in a Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- Kubernetes RBAC
- Helm
- GitOps
- Multi-tenancy

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD AppProject specification reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Projects user guide: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Applications in any namespace documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/app-any-namespace/
- Argo CD argocd-cmd-params-cm reference example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-cmd-params-cm-yaml/
- Argo CD cluster add command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_cluster_add/
- Argo Helm argo-cd chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl create role reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_role/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/

## Issues Found
- The limited ClusterRole example was not bound to the Argo CD application controller service account. Added a ClusterRoleBinding so the controller keeps the intended cluster-scope read permissions after the default cluster-wide binding is removed.
- The automation script used `--resource="*.*"`, which is not the documented kubectl resource form for granting all resources. Changed it to `--resource="*"`.
- The Helm namespace-scoped installation example used `ARGOCD_CONTROLLER_NAMESPACES` and per-component `clusterRoleRules.enabled` fields as if they limited destination namespaces. Replaced this with the chart's documented `createClusterRoles: false` control and clarified that `application.namespaces` only controls where Application custom resources may be created.
- The namespace-install manifest section implied that `application.namespaces` configures managed destination namespaces. Replaced it with the documented CRD installation prerequisite and `argocd cluster add --namespace` command for namespace-limited cluster registration.
- The common pitfall said blocked cluster-scoped resources fail silently. Updated it to say they fail during sync, which matches Argo CD's project enforcement behavior.

## Review Notes
The examples intentionally use broad namespace-level RBAC (`apiGroups: ["*"]`, `resources: ["*"]`, `verbs: ["*"]`) for brevity. In production, those rules should usually be narrowed to the exact API groups, resources, and verbs each team needs.
