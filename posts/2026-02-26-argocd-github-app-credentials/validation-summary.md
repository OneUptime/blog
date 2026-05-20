# Validation Summary: How to Add a Private Git Repository Using GitHub App Credentials in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- GitHub Apps
- GitHub Enterprise Server
- Kubernetes Secrets
- SealedSecrets / kubeseal
- GitOps repository credentials

## Sources Consulted
- Argo CD Private Repositories documentation: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/private-repositories/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_repo_add/
- GitHub Docs, choosing permissions for a GitHub App: https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/choosing-permissions-for-a-github-app
- GitHub Docs, differences between GitHub Apps and OAuth apps: https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps
- GitHub Docs, authenticating as a GitHub App installation: https://docs.github.com/en/enterprise-server@3.16/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets
- Referenced OneUptime repository credentials article: https://oneuptime.com/blog/post/2026-01-25-repository-credentials-argocd/view

## Issues Found
- The post stated that the GitHub App Installation ID was always required. Current Argo CD documentation says `--github-app-installation-id` is optional and Argo CD can automatically discover it from the repository organization. Updated Step 3 and Step 4 wording to make the Installation ID explicit-but-optional while preserving the existing examples that include it.

## Review Notes
- The Argo CD CLI flags, declarative Secret keys, `repo-creds` label, GitHub Enterprise base URL field, GitHub App token flow, and one-hour installation token lifetime were verified against official documentation.
- The local environment did not have `argocd` or `kubeseal` installed, so CLI verification relied on official command documentation rather than local `--help` output.
