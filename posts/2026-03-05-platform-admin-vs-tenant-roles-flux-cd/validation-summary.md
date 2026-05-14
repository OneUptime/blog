# Validation Summary: How to Configure Platform Admin vs Tenant Roles in Flux CD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Flux CD
- Kubernetes RBAC
- Kubernetes ServiceAccounts
- Kubernetes namespaces, ResourceQuota, LimitRange, and NetworkPolicy
- GitHub CODEOWNERS and branch protection
- GitOps repository organization

## Sources Consulted
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Kustomization API documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux security best practices: https://fluxcd.io/flux/security/best-practices/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes ServiceAccounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes ResourceQuota documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes LimitRange documentation: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes HorizontalPodAutoscaler documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- GitHub CODEOWNERS documentation: https://docs.github.com/articles/about-codeowners

## Issues Found
- The post stated that omitting `serviceAccountName` makes Flux use the `flux-system` default service account. Flux documentation says the controller uses the service account under which the controller runs unless a default service account flag or explicit `.spec.serviceAccountName` is configured. Updated the comments to describe the kustomize-controller service account permissions accurately.
- The platform admin `ClusterRole` claimed to provide full cluster permissions but only listed a subset of resources. Updated the role rules to cover all Kubernetes and Flux resources, matching the post's statement that platform administrators have full cluster permissions.
- The tenant examples configured `spec.serviceAccountName: team-alpha` and created a RoleBinding for that service account, but did not create the `ServiceAccount` object. Added the `ServiceAccount` manifest so Flux has an account to impersonate.

## Review Notes
- The tenant RBAC role is intentionally broad for namespace-scoped application deployment. In stricter environments, consider removing permissions for sensitive resources such as Secrets or ServiceAccounts and using policy admission controls to prevent privilege escalation paths.
- Flux multi-tenancy hardening commonly also uses controller flags such as `--no-cross-namespace-refs=true`, `--no-remote-bases=true`, and `--default-service-account=<name>`. The post remains correct as an RBAC-focused guide, but those controls would be useful additions in a future expanded version.
