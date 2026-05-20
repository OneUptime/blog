# Validation Summary: How to Bootstrap RBAC Configurations with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Application and ApplicationSet resources
- GitOps
- Kubernetes RBAC
- Kubernetes ServiceAccounts
- Kyverno policy validation
- EKS IAM Roles for Service Accounts (IRSA)

## Sources Consulted
- Kubernetes RBAC Authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Argo CD RBAC Configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Directory source documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/directory/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/applicationset-specification/
- Kyverno Validate Rules documentation: https://kyverno.io/docs/policy-types/cluster-policy/validate/

## Issues Found
- The post said ArgoCD reverts manual grants of extra permissions. Argo CD self-healing applies to resources it manages, not arbitrary manually-created RBAC resources outside the Application's tracked desired state. Changed the statement to say ArgoCD reverts manual changes to managed RBAC resources.
- The `ci-deployer` Kubernetes `ClusterRole` used `sync` as a verb on `applications.argoproj.io`. `sync` is an Argo CD RBAC action, not a Kubernetes API verb for the Application CRD. Changed the Kubernetes RBAC verbs to `get`, `list`, `watch`, `update`, and `patch`, which are appropriate for reading and updating Application objects through the Kubernetes API.

## Review Notes
All YAML snippets were parsed successfully after the corrections. The Kyverno policy uses strategic merge pattern negation to reject `roleRef.name: cluster-admin`, which is consistent with Kyverno validation pattern syntax. The ApplicationSet example assumes the matched `config.json` files contain fields such as `team.name` and `team.namespace`.
