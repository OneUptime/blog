# Validation Summary: How to Disable the ArgoCD Admin Account for Security

## Status
validated

## Post Type
Tutorial / security hardening guide

## Technologies Covered
- Argo CD
- Kubernetes ConfigMaps
- Argo CD CLI
- Argo CD RBAC
- SSO / OIDC / Dex

## Sources Consulted
- Argo CD local users/accounts documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/user-management/
- Argo CD RBAC configuration documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD `argocd account can-i` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account_can-i/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd-cm.yaml` reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/

## Issues Found
- The session timeout example used `timeout.session` and `timeout.session.maxlifetime`, which are not the current documented `argocd-cm` keys. Updated the example to use `users.session.duration: "8h"`, which is documented for Argo CD user session expiration.

## Review Notes
- The `admin.enabled: "false"` setting, local account `apiKey` / `login` capabilities, RBAC `policy.csv` examples, `scopes`, `argocd account generate-token --account`, and `argocd account get --account` usage align with official Argo CD documentation.
- The local Argo CD CLI was not installed in the review environment, so CLI verification was performed against official command reference documentation rather than local `--help` output.
