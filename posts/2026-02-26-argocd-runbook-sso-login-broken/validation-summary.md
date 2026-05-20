# Validation Summary: ArgoCD Runbook: SSO Login Broken

## Status
validated

## Post Type
Operational runbook

## Technologies Covered
- Argo CD
- Dex
- OpenID Connect
- OAuth2 SSO
- Kubernetes ConfigMaps and Secrets
- Argo CD RBAC
- TLS certificates

## Sources Consulted
- Argo CD User Management documentation: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD FAQ for admin password reset: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_login/
- Argo CD `argocd account update-password` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account_update-password/
- Argo CD `argocd admin initial-password` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_initial-password/
- Dex LDAP connector documentation: https://dexidp.io/docs/connectors/ldap/

## Issues Found
- The TLS certificate remediation for direct OIDC incorrectly suggested creating `argocd-tls-certs-cm` for the identity provider. Argo CD documents `oidc.config.rootCA` for direct OIDC provider trust and `oidc.tls.insecure.skip.verify` only as an emergency bypass. Updated the snippet to use `rootCA` and kept the insecure skip option clearly marked as not recommended.
- The emergency admin password reset command used `argocd account update-password --account admin --new-password <new-password>` after the initial admin secret was deleted. Official Argo CD guidance for forgotten admin passwords is to generate a bcrypt hash and patch `argocd-secret` with `admin.password` and `admin.passwordMtime`, or regenerate the initial password. Updated the runbook to show the bcrypt-and-patch flow.

## Review Notes
- The local environment did not have `kubectl` or `argocd` installed, so CLI flags were checked against official command references rather than local `--help` output.
- The post does not pin an Argo CD version. The reviewed behavior matches current official documentation as of 2026-05-20, with one version-sensitive note: the initial admin password secret applies to Argo CD v1.9 and later.
