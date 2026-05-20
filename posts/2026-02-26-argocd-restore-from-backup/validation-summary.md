# Validation Summary: How to Restore ArgoCD from Backup

## Status
validated

## Post Type
Tutorial / Disaster recovery guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- argocd CLI
- Bash
- Python / PyYAML
- jq

## Sources Consulted
- Argo CD Disaster Recovery documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/disaster_recovery/
- Argo CD `argocd admin import` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_import/
- Argo CD `argocd admin export` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_export/
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD v3.4.2 release quick start: https://github.com/argoproj/argo-cd/releases/tag/v3.4.2
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes `kubectl rollout restart` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_restart/
- Kubernetes API concepts documentation: https://kubernetes.io/docs/reference/using-api/api-concepts/

## Issues Found
- The `argocd admin import` example omitted the required `SOURCE` argument. Changed it to `argocd admin import - -n argocd < argocd-backup.yaml`, matching the official stdin form where `-` means read from stdin.
- The Argo CD install example used the outdated `v2.13.0` manifest. Updated it to the current official `v3.4.2` release manifest and included the `--server-side --force-conflicts` flags shown in the release quick start.
- The `kubectl rollout restart` examples used separated resource type/name arguments. Updated them to the documented `RESOURCE` form such as `deployment/argocd-server` and `statefulset/argocd-application-controller`.
- The restore script used `BACKUP_DIR="$1"` under `set -u`, which exits with an unbound variable before the usage check when no argument is provided. Changed it to `BACKUP_DIR="${1:-}"`.

## Review Notes
The manual cleanup snippets rely on Python with PyYAML installed, but that dependency is not listed in the prerequisites. The restore script's compressed-backup extraction assumes the tarball contains a single top-level entry. These are operational caveats rather than direct command correctness errors.
