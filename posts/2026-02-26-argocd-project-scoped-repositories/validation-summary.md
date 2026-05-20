# Validation Summary: How to Use Project Scoped Repositories in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Secrets
- Argo CD AppProjects and `sourceRepos`
- Argo CD repository credentials and credential templates
- Helm OCI repositories
- External Secrets Operator

## Sources Consulted
- Argo CD Projects documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/projects/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd repo get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_get/
- Argo CD `argocd repo list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_list/
- Argo CD private repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD source code for repository and repo-creds Secret handling: https://github.com/argoproj/argo-cd
- External Secrets Operator ExternalSecret API documentation: https://external-secrets.io/latest/api/externalsecret/

## Issues Found
- The post claimed any project can use any configured repository without mentioning AppProject `sourceRepos`. Updated the wording to clarify that global credentials are usable by projects whose `sourceRepos` policy allows the URL.
- The post claimed users in any project can see another team's repository credentials. Updated this to the more accurate risk: global credentials are not team-scoped and can be reused through Argo CD if policy allows.
- The multi-team example said it covered three teams, but it only showed two team-specific examples plus a shared repository. Updated this to two teams.
- The post claimed `repo-creds` credential templates are project-scoped. Argo CD's current `RepoCreds` type and Secret conversion code do not include a project field for repo-creds templates, so the section was corrected to describe global URL-prefix templates.
- The credential precedence list included project-scoped credential templates. Updated it to repository Secret precedence followed by global credential templates with longest-prefix matching.
- The External Secrets Operator example used `external-secrets.io/v1beta1`. Updated it to the current `external-secrets.io/v1` API version.
- The `argocd repo get` verification command omitted `--project`, which is needed to disambiguate project-scoped repositories when the same URL may exist in multiple projects. Added `--project payments`.
- The troubleshooting `kubectl custom-columns` command displayed `.data.project` as base64-encoded Secret data. Replaced it with a Go template that decodes the project value and displays `-` for global repositories.
- The summary recommended credential templates for team isolation. Updated it to recommend repository Secrets for team isolation and templates only for credentials that may apply to all matching repositories.

## Review Notes
The local environment did not have the `argocd` CLI installed, so CLI validation was performed against the official Argo CD command reference instead of local `--help` output. The Argo CD docs include an older proposal page whose non-goal text also says repo-creds templates were not project-scoped; the current implementation was checked directly to confirm the corrected behavior.
