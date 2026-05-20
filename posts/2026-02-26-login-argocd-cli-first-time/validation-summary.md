# Validation Summary: How to Login to ArgoCD Using CLI for the First Time

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- Argo CD CLI
- Kubernetes
- kubectl
- GitOps
- TLS certificates

## Sources Consulted
- Argo CD Getting Started: https://argo-cd.readthedocs.io/en/stable/getting_started/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_login/
- Argo CD FAQ, admin password reset: https://argo-cd.readthedocs.io/en/release-3.2/faq/
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_create/
- Argo CD `argocd account update-password` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_update-password/
- Argo CD `argocd account generate-token` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_generate-token/
- Argo CD `argocd cluster list` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_list/
- Kubernetes `kubectl port-forward` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The TLS certificate example used `argocd login --certificate-authority`, but the Argo CD login command uses `--server-crt` for the Argo CD server certificate. Updated the command to use `--server-crt argocd-ca.crt`.
- The token-based environment variable example set `ARGOCD_SERVER` and `ARGOCD_AUTH_TOKEN` but omitted TLS handling for the default self-signed certificate case covered by the article. Added `ARGOCD_OPTS='--insecure'` so the example works consistently in that scenario.
- The password reset snippet generated a bcrypt hash into `HASH` for the Python path but patched Kubernetes with `NEW_HASH`. Renamed the Python variable to `NEW_HASH` so both alternatives feed the documented patch command.

## Review Notes
The main first-login flow, initial admin secret retrieval, password update command, initial secret deletion recommendation, port-forward command, guestbook example application, and app sync flow match the current official Argo CD documentation. The local environment did not have the `argocd` binary installed, so CLI flags were verified against official command references rather than local `--help` output.
