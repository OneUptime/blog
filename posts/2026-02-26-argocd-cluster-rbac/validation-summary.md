# Validation Summary: How to Handle Cluster RBAC When Adding to ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD cluster management
- Argo CD AppProject restrictions
- Kubernetes RBAC
- Kubernetes ServiceAccounts, Roles, ClusterRoles, RoleBindings, and ClusterRoleBindings
- kubectl authorization checks
- CustomResourceDefinitions

## Sources Consulted
- Argo CD security documentation: https://argo-cd.readthedocs.io/en/release-2.2/operator-manual/security/
- Argo CD declarative cluster secret documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#clusters
- Argo CD AppProject specification: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD `clusterauth` package documentation for generated `argocd-manager` RBAC: https://pkg.go.dev/github.com/argoproj/argo-cd/v3@v3.4.1/util/clusterauth
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i

## Issues Found
- The "Preventing Privilege Escalation" ClusterRole used `apiGroups: ["", "apps", "batch"]` with `resources: ["*"]`. In a ClusterRoleBinding, the core API wildcard would grant write access to cluster-scoped core resources such as Namespaces and PersistentVolumes, which was broader than the surrounding explanation. Replaced it with explicit workload resource lists matching the earlier least-privilege example.
- The same section described omitted RBAC permissions as an explicit deny. Kubernetes RBAC is additive and has no deny rules, so the comment was changed from "EXPLICITLY DENY" to "DO NOT GRANT."
- The AppProject example omitted `sourceRepos`. Added `sourceRepos: ["*"]` so the example remains functional while focusing the restriction discussion on destinations and resource allow/deny lists.
- The CRD section said to consider restricting to specific CRD names while also granting `create`. Kubernetes RBAC `resourceNames` cannot restrict top-level `create` requests, so the note now clarifies that resource-name restrictions are useful for existing-resource verbs such as get/update/patch, not create.

## Review Notes
The remaining examples are intentionally broad in places, such as cluster-wide read access and namespace-level wildcard write access. That is consistent with Argo CD's documented need to watch managed cluster state, but production deployments should still tailor resource lists, namespaces, and AppProject policies to the actual manifests being deployed. `kubectl` was not installed in the local environment, so CLI syntax was checked against the official Kubernetes command reference instead of local `--help` output.
