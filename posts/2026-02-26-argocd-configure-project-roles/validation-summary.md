# Validation Summary: How to Configure Project Roles in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD project roles
- Argo CD RBAC / Casbin policies
- Argo CD CLI
- Kubernetes AppProject manifests
- SSO group mapping
- JWT automation tokens

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD RBAC configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd proj role add-policy` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_role_add-policy/
- Argo CD `argocd proj role create` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_role_create/
- Argo CD `argocd proj role list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_role_list/
- Argo CD `argocd proj role add-group` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_role_add-group/
- Argo CD `argocd proj role remove-group` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_proj_role_remove-group/
- Argo CD `argocd account get-user-info` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_get-user-info/

## Issues Found
- The CLI examples for `argocd proj role add-policy backend developer` passed `-o "backend/*"` and `-o "backend/*-dev"`. The official command reference defines `--object` as the object within the project and shows that Argo CD prefixes the project name when it creates the policy. Updated these examples to `-o "*"` and `-o "*-dev"` so they generate `backend/*` and `backend/*-dev` policies instead of unintended `backend/backend/*` patterns.
- The post said deny rules always take precedence over allow rules. That is true for matching subject-specific policies, but Argo CD documents that permissions granted by the default global policy cannot be blocked by a deny rule. Added this caveat in the deny-rule section and the global RBAC interaction section.
- The resource/action table was labeled as all available resources, but it only listed the project-scoped resources used by the examples. Changed the wording to "Common project-scoped resources" to avoid implying the table is exhaustive.

## Review Notes
The local environment did not have the `argocd` CLI installed, so command validation was performed against the official Argo CD command reference. The examples are otherwise consistent with current Argo CD project role and RBAC documentation. Real deployments may need additional Argo CD CLI connection flags depending on server TLS, context, proxy, or port-forwarding setup.
