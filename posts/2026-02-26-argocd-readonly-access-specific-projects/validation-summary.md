# Validation Summary: How to Grant Read-Only Access to Specific Projects in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Kubernetes ConfigMaps
- OIDC / Okta SSO
- Argo CD CLI

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD argocd-rbac-cm example: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-rbac-cm-yaml/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD Okta user management guide: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/okta/
- Argo CD OIDC user management guide: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD built-in policy source: https://github.com/argoproj/argo-cd/blob/master/assets/builtin-policy.csv
- Argo CD RBAC CLI source: https://github.com/argoproj/argo-cd/blob/master/cmd/argocd/commands/admin/settings_rbac.go

## Issues Found
- The post said `role:readonly` exposes "infrastructure secrets." The built-in readonly role grants read access to Argo CD resources such as applications, ApplicationSets, certificates, clusters, repositories, projects, accounts, GPG keys, and logs, but the wording overstated Kubernetes secret visibility. I changed the claim to reference application definitions and repository/cluster entries.
- The object-format section described `<project>/<application>` as universal. Argo CD uses `<project>/<application-namespace>/<application>` when applications in any namespace are enabled. I added this caveat.
- The `*/*` example was described as "same as global readonly." That pattern grants application `get` access across projects, but the built-in `role:readonly` grants read access to additional Argo CD resource types. I changed the comment to "All apps in all projects."
- The Okta OIDC section implied that requesting the `groups` scope alone is enough. Argo CD's Okta guidance also shows requesting the `groups` ID-token claim and requires Okta to return it. I added `requestedIDTokenClaims` and adjusted the surrounding sentence.

## Review Notes
The `argocd admin settings rbac can` examples use `applications`, which is accepted by the current CLI source even though the command reference examples use the singular alias `application`. The post does not pin an Argo CD version; the reviewed guidance matches current stable/latest Argo CD RBAC documentation as of 2026-05-20.
