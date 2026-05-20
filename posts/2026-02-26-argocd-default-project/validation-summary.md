# Validation Summary: How to Use the Default Project in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD AppProjects
- Argo CD RBAC
- Argo CD CLI
- Kubernetes custom resources
- GitOps deployment configuration

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_set/

## Issues Found
- The post said any user with access to Argo CD could deploy through the default project. I changed this to users with permission to create or manage applications, because Argo CD RBAC still controls application actions.
- The post said deleting the `default` project would cause Argo CD to recreate it. I changed this to match the official documentation: the `default` project can be modified, but not deleted.
- The lock-down manifest used an empty `namespaceResourceWhitelist`. I changed it to use `namespaceResourceBlacklist` with `group: "*"` and `kind: "*"`, and added `sourceNamespaces: []`, matching the current official example for removing permissions from the default project.

## Review Notes
The Argo CD CLI was not installed locally, so CLI flags were verified against the official command reference instead of local `--help` output. The remaining AppProject fields, RBAC policy syntax, and Kubernetes commands are consistent with current Argo CD documentation.
