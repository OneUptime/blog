# Validation Summary: ArgoCD Best Practices for Small Teams

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kustomize
- Argo CD Notifications
- Sealed Secrets
- Argo CD Image Updater
- Slack notifications

## Sources Consulted
- Argo CD Application specification: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD automated sync policy: https://argo-cd.readthedocs.io/en/release-2.11/user-guide/auto_sync/
- Argo CD RBAC configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD notifications service overview: https://argo-cd.readthedocs.io/en/latest/operator-manual/notifications/services/overview/
- Argo CD notification subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD notification triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/
- Sealed Secrets official README: https://github.com/bitnami-labs/sealed-secrets
- Argo CD Image Updater image configuration: https://argocd-image-updater.readthedocs.io/en/stable/configuration/images/
- Argo CD Image Updater update methods: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-methods/
- Argo CD Image Updater update strategies: https://argocd-image-updater.readthedocs.io/en/latest/basics/update-strategies/

## Issues Found
- The Kustomize examples used `patchesStrategicMerge`, which is deprecated in current Kustomize/kubectl usage. Replaced it with the current `patches` field using `path` entries.
- The notification trigger expressions accessed `app.status.operationState.phase` directly. Argo CD documents that `operationState` is optional and recommends optional chaining to avoid expression evaluation failures. Updated the sync succeeded and failed triggers to use `app.status?.operationState.phase`.
- The Image Updater example used legacy Application annotations and included `web.semver-constraint`, which is not part of the official Image Updater annotation set. Replaced the example with the current `ImageUpdater` custom resource format using `imageName` for the semver constraint and `writeBackConfig.method: git`.
- The Image Updater explanation said the updater updates the deployment directly. With Git write-back, current documentation says it commits image parameter updates to Git. Updated the wording accordingly.

## Review Notes
The Argo CD Application, automated sync, `CreateNamespace=true`, RBAC, notification subscription annotation, Slack service token reference, `kubectl create secret generic --dry-run=client -o yaml`, `kubeseal --format yaml`, and Sealed Secrets storage claims were consistent with the referenced official documentation. The post intentionally gives small-team operational guidance; recommendations such as using the default project or Sealed Secrets over Vault are pragmatic choices rather than universal requirements.
