# Validation Summary: How to Set Up ArgoCD Notifications from Scratch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps, Secrets, annotations, and kubectl commands
- Argo CD CLI
- Slack notification service
- Webhook notification service
- Go/html templates and Argo CD trigger expressions

## Sources Consulted
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD notification triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD webhook notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Slack notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD notification subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD notifications catalog manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/notifications_catalog/install.yaml
- Argo Helm chart values on Artifact Hub: https://artifacthub.io/packages/helm/argo/argo-cd

## Issues Found
- The post said notification configuration lives in two ConfigMaps and one Secret and told readers to check an `argocd-notifications-catalog` ConfigMap. Current Argo CD uses `argocd-notifications-cm` and `argocd-notifications-secret`; the official catalog is applied from `notifications_catalog/install.yaml` into the notifications ConfigMap. Updated the resource count and removed the nonexistent catalog ConfigMap check.
- Trigger examples accessed `app.status.operationState.phase` directly. Argo CD documents `status.operationState` as optional and recommends optional chaining for this field. Updated trigger conditions to use `app.status?.operationState.phase`.
- The built-in catalog section implied that built-in template names could be referenced just by defining trigger keys. Added the official `kubectl apply -n argocd --server-side --force-conflicts -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/notifications_catalog/install.yaml` command before the built-in template examples.
- The troubleshooting section described missing secrets as template references that fail silently. Slack tokens are service configuration secret references, and the controller logs delivery/configuration errors. Updated that bullet.

## Review Notes
The webhook and Slack service snippets match current Argo CD documentation. The webhook subscription annotations with empty recipients are valid for webhook services. The Helm `notifications.enabled` setting is valid for the Argo project Helm chart, although defaults vary across charts and distributions.
