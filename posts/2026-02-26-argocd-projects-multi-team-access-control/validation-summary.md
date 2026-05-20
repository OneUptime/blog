# Validation Summary: How to Use Projects for Multi-Team Access Control in ArgoCD

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Argo CD AppProjects
- Argo CD RBAC
- Argo CD OIDC/SSO configuration
- Kubernetes ConfigMaps and namespaces
- GitOps access control patterns

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD OIDC user management documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/user-management/
- Argo CD argocd-cm.yaml reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD RBAC can command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD RBAC validate command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_rbac_validate/
- Linked OneUptime related posts were checked for availability:
  - https://oneuptime.com/blog/post/2026-02-26-argocd-projects-team-isolation/view
  - https://oneuptime.com/blog/post/2026-01-25-rbac-policies-argocd/view
  - https://oneuptime.com/blog/post/2026-01-25-multi-tenancy-argocd/view

## Issues Found
- Two illustrative project-structure snippets were fenced as `yaml` even though they contained plain text labels rather than valid YAML documents. Changed those fences to `text` so the examples are not presented as YAML configuration.
- The backend project implementation did not grant the cross-project read-only access shown in the access control matrix. Added a `viewer` project role for `my-org:all-engineering` in the backend project example and in the reusable team template.
- The RBAC audit commands used the outdated/incorrect `argocd admin rbac` command path. Updated them to the documented `argocd admin settings rbac can` and `argocd admin settings rbac validate` commands, using the documented `can` argument order and `--namespace argocd` for live ConfigMap checks.

## Review Notes
- All remaining YAML configuration blocks were parsed successfully after the fixes.
- The Argo CD CLI was not installed locally, so CLI verification was performed against the official Argo CD command reference rather than local `--help` output.
