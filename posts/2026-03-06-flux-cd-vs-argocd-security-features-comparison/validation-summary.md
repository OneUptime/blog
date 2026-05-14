# Validation Summary: Flux CD vs ArgoCD: Security Features Comparison

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Flux CD
- Argo CD
- Kubernetes RBAC and NetworkPolicy
- SOPS
- Sealed Secrets
- Argo CD Vault Plugin
- Cosign
- GnuPG commit verification
- SLSA provenance
- OIDC and Dex
- OPA and Kyverno

## Sources Consulted
- Flux multi-tenancy documentation: https://fluxcd.io/flux/installation/configuration/multitenancy/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux Image Reflector documentation: https://fluxcd.io/flux/components/image/
- Flux SLSA assessment: https://v2-6.docs.fluxcd.io/flux/security/slsa-assessment/
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD architecture documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/
- Argo CD user management and SSO documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD Config Management Plugins documentation: https://argo-cd.readthedocs.io/en/release-3.4/operator-manual/config-management-plugins/
- Argo CD GnuPG source integrity documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/source-integrity-git-gpg/
- Argo CD security and auditing documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/security/
- Argo CD Vault Plugin installation documentation: https://argocd-vault-plugin.readthedocs.io/en/v1.13.0/installation/
- Argo CD Vault Plugin usage documentation: https://argocd-vault-plugin.readthedocs.io/en/v1.13.0/usage/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The Flux multi-tenancy table entry described "namespace-scoped controllers", which is misleading because Flux controllers are commonly installed centrally and use namespace/service-account scoped reconciliation for tenant isolation. Updated the table wording.
- The Flux RBAC example bound the tenant service account to the `cluster-admin` ClusterRole and then defined an unbound restricted Role. Changed the RoleBinding to bind the tenant service account to the restricted Role.
- The Flux RBAC example attempted to deny namespace access with an empty `verbs` list. Kubernetes RBAC is additive and does not support deny rules, so the invalid deny rule was removed.
- The Flux Kustomization comment said `targetNamespace` prevents cross-namespace references. `targetNamespace` sets or overrides the namespace for rendered resources; it does not enforce cross-namespace reference lockdown. Updated the comment.
- The table described Argo CD network policy posture as "no inbound required". Argo CD reconciliation is pull-based, but the Argo CD API server is exposed for UI, CLI, and API access. Updated the table and network section wording.
- The table implied Argo CD has a service account per resource via AppProject. AppProjects provide project-level controls, while deployment permissions depend on destination cluster credentials and Kubernetes RBAC. Updated the table wording.
- The table called Flux Image Reflector "container image scanning", which can be confused with vulnerability scanning. Flux Image Reflector scans image repositories for metadata and tags. Updated the wording.
- The Argo CD Vault Plugin sidecar example omitted the Config Management Plugin configuration and the plugin binary mount, and used the Argo CD image as if it contained the plugin. Replaced it with a sidecar CMP example that mounts plugin config and downloads the AVP binary.
- The Flux GitRepository example used `spec.verification`, but the current Flux API uses `spec.verify`. Updated the field.
- The Argo CD signature verification example used the legacy `signatureKeys` AppProject field. Current Argo CD documentation recommends `spec.sourceIntegrity.git.policies`; updated the example to use the current format.
- The audit logging claims overstated Argo CD as having a single built-in centralized audit log. Updated the table, decision guidance, and conclusion to refer to Git history, Kubernetes Events, API logs, and UI-visible deployment history.

## Review Notes
The post is technically relevant and contains implementation-level YAML examples. Some examples remain illustrative rather than drop-in production manifests, especially network policies and Argo CD deployment patches, because real installations vary by labels, installed components, and Helm/Kustomize overlays.
