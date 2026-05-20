# Validation Summary: How to Change the ArgoCD Admin Password

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Kubernetes Secrets, ConfigMaps, Deployments, and CronJobs
- Helm
- bcrypt
- Bash
- Python
- OpenSSL

## Sources Consulted
- Argo CD account update-password command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_update-password/
- Argo CD FAQ, admin password reset: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD argocd-secret example: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-secret-yaml/
- Argo CD user management documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD account bcrypt command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account_bcrypt/
- Argo CD login command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD account generate-token command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD getting started guide, initial admin password: https://argo-cd.readthedocs.io/en/release-3.4/getting_started/
- Argo CD Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml

## Issues Found
- The opening paragraph said anyone with cluster access can read the initial admin password secret. Kubernetes Secrets are readable by users or service accounts with RBAC permission to read secrets in the relevant namespace, so this was changed to "anyone with permission to read secrets in the ArgoCD namespace."
- The CronJob example used `bitnami/kubectl:latest`, but the script also requires Bash, OpenSSL, Python, and the Python `bcrypt` package. The image was changed to a custom rotator image placeholder with a comment listing the required tools.
- The bcrypt troubleshooting section said ArgoCD expects `$2a$` hashes and grouped `$2b$` with `$2y$` as prefixes to convert. Official Argo CD and Helm examples commonly use `$2a$`, and Helm chart guidance converts `htpasswd` `$2y$` output to `$2a$`; the text was narrowed to that documented case.

## Review Notes
The Argo CD CLI password update flags, `argocd-secret` fields, `admin.passwordMtime` usage, Helm values, local account password update command, initial admin secret deletion, admin account toggle, and API token command matched current official documentation. The automation examples still require production hardening, including a real secret-manager integration and RBAC for the CronJob service account.
