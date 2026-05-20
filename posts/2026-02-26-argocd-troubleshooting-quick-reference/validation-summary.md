# Validation Summary: ArgoCD Troubleshooting Quick Reference

## Status
validated

## Post Type
Reference

## Technologies Covered
- Argo CD
- Kubernetes
- GitOps
- Helm
- Kustomize
- Dex/OIDC
- Redis

## Sources Consulted
- Argo CD command reference: `argocd app get`, `argocd app sync`, `argocd app diff`, `argocd app resources`, `argocd app create`, `argocd app terminate-op` - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/
- Argo CD repository and certificate command reference - https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/ and https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cert/
- Argo CD account and RBAC command reference - https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_account/ and https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD diff customization documentation - https://argo-cd.readthedocs.io/en/latest/user-guide/diffing/
- Argo CD sync phases and hooks documentation - https://argo-cd.readthedocs.io/en/release-3.3/user-guide/sync-waves/
- Argo CD high availability and scaling documentation - https://argo-cd.readthedocs.io/en/stable/operator-manual/high_availability/
- Argo CD FAQ for admin password reset behavior - https://argo-cd.readthedocs.io/en/latest/faq/
- Kubernetes `kubectl` command reference - https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post used `argocd app diff <app-name> --resource <group>:<kind>:<name>`, but the current Argo CD `app diff` command does not provide a `--resource` flag. Replaced it with `argocd app resources <app-name> --output tree=detailed` to inspect resource-level sync and health details.
- The post said `argocd app sync <app-name> --prune --force` would skip stuck hooks. That command forces/prunes a sync but does not skip hooks. Replaced it with a safer hook-job cleanup step followed by a normal prune sync.
- The admin password reset example generated the bcrypt hash with `htpasswd` and only patched `admin.password`. Argo CD's official command reference provides `argocd account bcrypt`, and the password modification time should be updated as well, so the command now uses `argocd account bcrypt` and patches `admin.passwordMtime`.
- The RBAC troubleshooting section used `argocd account get --account <username>` to check groups. That command returns account details, not the current user's SSO claims. Replaced it with `argocd account get-user-info -o yaml`.

## Review Notes
Most commands are correct for standard Argo CD installations, but several operational examples assume default component names and the `argocd` namespace. Helm-chart installs with custom component names may require the matching Argo CD CLI name flags or adjusted Kubernetes selectors.
