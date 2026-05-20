# Validation Summary: How to Configure Git Credentials for GitHub Enterprise in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD repository credentials
- Kubernetes Secrets and ConfigMaps
- GitHub Enterprise Server
- GitHub personal access tokens
- GitHub Apps
- SSH known hosts
- TLS certificate trust configuration
- Kubernetes CLI workflows

## Sources Consulted
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/private-repositories/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD repository Secret examples: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-repositories-yaml/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- GitHub Enterprise Server personal access token documentation: https://docs.github.com/en/enterprise-server@latest/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens
- GitHub App permissions documentation for GitHub Enterprise Server: https://docs.github.com/en/enterprise-server@3.19/rest/authentication/permissions-required-for-github-apps
- GitHub Apps for GitHub Enterprise Server documentation: https://docs.github.com/en/apps/sharing-github-apps/making-your-github-app-available-for-github-enterprise-server

## Issues Found
- The `argocd-ssh-known-hosts-cm` example omitted the `app.kubernetes.io/part-of: argocd` label. Argo CD's declarative setup documentation warns that Argo CD ConfigMaps should have this label so Argo CD can use them. Added the label to the example.
- The `argocd-tls-certs-cm` example omitted the `app.kubernetes.io/part-of: argocd` label. Added the label for the same reason.
- The security best practices section said to grant only `repo` read access. GitHub classic PAT `repo` scope is broader than read-only private repository access, so this was corrected to recommend minimum required access, such as a GitHub App or fine-grained PAT with read-only repository contents access, and to use classic `repo` scope only when necessary.

## Review Notes
- The Argo CD GitHub App fields, including `githubAppEnterpriseBaseUrl`, match current Argo CD documentation for GitHub Enterprise Server.
- The `argocd repo add`, `argocd app create`, SSH known hosts, TLS certificate, repository Secret, and credential template examples are consistent with current Argo CD documentation after the fixes above.
- GitHub classic PATs remain usable for HTTPS Git access, but GitHub's documentation recommends fine-grained PATs where possible and GitHub Apps for long-lived organizational integrations.
