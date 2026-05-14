# Validation Summary: How to Set Up Multi-Tenant Flux CD with Namespace Isolation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Kubernetes RBAC
- Kustomize
- Flux GitRepository and Kustomization custom resources

## Sources Consulted
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux source API reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux security best practices: https://fluxcd.io/flux/security/best-practices/
- Flux multi-tenancy example repository: https://github.com/fluxcd/flux2-multi-tenancy
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The prerequisites listed Kubernetes v1.20 or later, which is outdated for current Flux releases. Updated the requirement to use a Kubernetes version supported by the installed Flux release and noted that current Flux releases require Kubernetes v1.33 or later.
- The prerequisites did not mention Flux multi-tenancy lockdown, which is required for the stronger isolation guarantees described in the post. Added that Flux should be installed with multi-tenancy lockdown enabled.
- The initial directory creation commands did not create `tenants/base/team-alpha`, even though later manifests are stored under that path. Updated the command to create the tenant directory directly.
- The GitRepository section said `serviceAccountName` ensures reconciliation happens under the tenant identity, but the shown GitRepository does not set that field and GitRepository `serviceAccountName` is for supported source authentication scenarios, not Kustomization apply impersonation. Reworded the explanation to describe the GitRepository as the tenant source and mention `secretRef` for private repositories.
- The platform Kustomization that registers tenants did not specify `serviceAccountName`. In Flux multi-tenancy lockdown, the platform-admin Kustomization should reconcile under a privileged service account such as `kustomize-controller`. Added `serviceAccountName: kustomize-controller`.
- The security considerations did not explicitly mention preventing cross-namespace references to Flux resources. Added a bullet recommending Flux multi-tenancy lockdown.

## Review Notes
The RoleBinding to the `cluster-admin` ClusterRole is valid when bound with a namespaced RoleBinding: it grants broad permissions only inside the tenant namespace. For stricter least-privilege environments, a narrower ClusterRole can be used, but Flux's tenant tooling also defaults to a cluster role named `cluster-admin` for tenant RoleBindings.
