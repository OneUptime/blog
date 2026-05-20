# Validation Summary: How to Handle ArgoCD During Disaster Recovery Drills

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Velero
- Bash
- jq
- Kubernetes CronJob

## Sources Consulted
- Argo CD Disaster Recovery documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/disaster_recovery/
- Argo CD Declarative Setup documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/declarative-setup/
- Argo CD Architecture documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/architecture/
- Argo CD CLI command reference for `argocd app list`: https://argo-cd.readthedocs.io/en/release-2.8/user-guide/commands/argocd_app_list/
- Argo CD Notifications documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD GitHub releases: https://github.com/argoproj/argo-cd/releases
- Velero resource filtering documentation: https://velero.io/docs/main/resource-filtering/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Secrets good practices and encryption-at-rest documentation: https://kubernetes.io/docs/concepts/security/secrets-good-practices/ and https://kubernetes.io/docs/tasks/administer-cluster/encrypt-data/

## Issues Found
- The backup script comment implied Kubernetes Secrets are always encrypted at rest. Kubernetes Secrets are stored unencrypted by default unless encryption at rest is configured, so the comment was changed to emphasize secure storage and transfer of backups.
- The restore sequence backed up `argocd-cmd-params-cm` but did not restore it. Added the missing `kubectl apply` command so runtime parameters managed through that ConfigMap are restored.
- The backup script optionally exported `argocd-gpg-keys-cm`, but the restore sequence never applied it. Added a guarded restore command so GPG key configuration is restored when the backup file exists.
- The validation script piped `kubectl` jsonpath output for ConfigMap `.data` into `jq`, but that jsonpath output is not JSON. Changed the command to request full JSON and select `.data | keys` in `jq`.
- The CronJob example used `$ARGOCD_TOKEN` without defining how that token is provided. Changed the command to use Argo CD CLI core mode, which is a documented CLI option for talking directly to Kubernetes from inside the cluster.
- The CronJob example pinned the Argo CD image to `v2.10.0`, which is outdated as of the validation date. Updated the example image tag to the current upstream release, `v3.4.2`.

## Review Notes
The official Argo CD disaster recovery documentation also supports `argocd admin export` and `argocd admin import` for full Argo CD data export/import. The post's manual Kubernetes-resource backup approach is still technically valid for the resources it lists, but future improvements could mention the official export/import workflow as an alternative.
