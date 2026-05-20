# Validation Summary: How to Reset ArgoCD Admin Password When Locked Out

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Argo CD
- Kubernetes Secrets
- kubectl
- Argo CD CLI
- bcrypt
- curl / Argo CD REST API

## Sources Consulted
- Argo CD FAQ: https://argo-cd.readthedocs.io/en/latest/faq/
- Argo CD getting started guide: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Argo CD `argocd account bcrypt` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_bcrypt/
- Argo CD `argocd account update-password` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_account_update-password/
- Argo CD user management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Argo CD `argocd-secret.yaml` reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/argocd-secret-yaml/
- Kubernetes Secret documentation: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Argo CD settings initialization implementation: https://github.com/argoproj/argo-cd/blob/master/util/settings/settings.go

## Issues Found
- The original Method 2 implied Argo CD would reuse an existing `argocd-initial-admin-secret` password after clearing `admin.password`. Argo CD actually generates a fresh password and creates or updates `argocd-initial-admin-secret` with that value. I changed the text and commands to read the regenerated password after the restart.
- The original Method 3 said to manually create `argocd-initial-admin-secret` with a chosen password and then clear `argocd-secret`. Argo CD generates the initial password itself and writes it to `argocd-initial-admin-secret` when the admin password is missing; the initial secret is not a supported pre-seed input for an arbitrary password. I changed the method to clear the password fields, restart `argocd-server`, and read the regenerated initial admin password.
- The API verification curl example omitted the JSON `Content-Type` header. Current Argo CD API documentation includes `Content-Type: application/json` for the session request, so I added that header.

## Review Notes
- The direct bcrypt patch method, `argocd account bcrypt` command, `admin.enabled: "false"` setting, `argocd account update-password` flags, and Kubernetes Secret `stringData` usage match official documentation.
- The post assumes Argo CD v1.9 or later behavior for `argocd-initial-admin-secret`, which is current behavior. Argo CD v1.8 and earlier used the server pod name as the initial admin password.
