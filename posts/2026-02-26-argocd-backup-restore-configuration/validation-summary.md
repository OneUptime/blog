# Validation Summary: How to Backup and Restore ArgoCD Configuration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes
- kubectl
- Kubernetes CronJob
- Kubernetes RBAC
- AWS S3
- GPG
- yq

## Sources Consulted
- Argo CD Disaster Recovery: https://argo-cd.readthedocs.io/en/latest/operator-manual/disaster_recovery/
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD GnuPG verification: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/gpg-verification/
- Argo CD command reference for `argocd admin`: https://argo-cd.readthedocs.io/en/release-2.10/user-guide/commands/argocd_admin/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes `kubectl apply` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/

## Issues Found
- The post omitted `argocd-secret` from the kubectl backup and restore examples. Argo CD stores sensitive server configuration there, so the backup would be incomplete for common SSO/webhook/admin-secret scenarios. Added `argocd-secret` to the resource list, backup commands, automated backup, and restore commands.
- The post treated GPG keys as Secrets labeled `argocd.argoproj.io/secret-type=gnupg-key`. Argo CD stores configured GnuPG public keys in the `argocd-gpg-keys-cm` ConfigMap. Replaced the incorrect Secret backup with `argocd-gpg-keys-cm` backup and restore coverage.
- The automated CronJob used `bitnami/kubectl:latest` and installed `awscli` with `apt-get` at runtime. That is not a reliable Kubernetes job example because the image is not guaranteed to include or permit package installation. Changed it to use an image that already contains `kubectl`, `awscli`, and `bash`.
- The partial restore command piped a backup file into `kubectl get application`, which does not extract an object from a saved YAML list. Replaced it with a `yq` filter that selects the named Application from the kubectl list backup and pipes it to `kubectl apply -f -`.

## Review Notes
The main Argo CD `argocd admin export` / `argocd admin import -` workflow matches the official disaster recovery documentation. The CronJob remains an example and assumes the reader supplies the referenced custom image and S3 credentials.
