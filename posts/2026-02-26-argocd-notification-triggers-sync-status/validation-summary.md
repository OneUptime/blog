# Validation Summary: How to Configure Notification Triggers Based on Sync Status in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD Notifications
- Argo CD Application sync status and operation state
- Kubernetes ConfigMaps and Application resources
- kubectl
- Slack notification service configuration

## Sources Consulted
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD notification triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD triggers and templates catalog: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/catalog/
- Argo CD 2.2 to 2.3 upgrade notes: https://argo-cd.readthedocs.io/en/release-3.1/operator-manual/upgrading/2.2-2.3/
- Argo CD Slack notification service: https://argo-cd.readthedocs.io/en/release-2.6/operator-manual/notifications/services/slack/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl logs reference: https://v1-34.docs.kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The post said Argo CD Notifications is bundled in Argo CD v2.6 or later. Official upgrade notes state Notifications and ApplicationSet became part of Argo CD in v2.3, so the prerequisite text was corrected to v2.3 or later when using the default manifests.
- The post described the trigger system as using Go templates. Official documentation says trigger condition evaluation is powered by the expr language, while notification templates use Go templates, so that explanation was corrected.
- Several trigger examples accessed `app.status.operationState.phase` directly. Official documentation notes `operationState` is optional and direct access can fail, so those examples now use optional chaining such as `app.status?.operationState.phase`.
- The successful, failed, running, and sync-complete trigger examples were updated to use `oncePer` with optional-chained `startedAt` or `finishedAt` fields where appropriate, aligning them with the later complete example and reducing duplicate notifications for repeated operation states.
- The post described `oncePer` as preventing a notification on every reconciliation loop. Official documentation frames `oncePer` as preventing repeated notifications when a condition becomes true repeatedly, such as during flapping, so the explanation was corrected.
- The common pitfall about nil checks was updated to recommend optional chaining and to state that direct access causes expression evaluation to fail.

## Review Notes
- The Slack examples use `token: $slack-token`, which is consistent with Argo CD's notification service configuration pattern, but a real deployment must also define the corresponding key in `argocd-notifications-secret`.
- The template examples use `.app.spec.source`, which is valid for single-source Applications. Multi-source Applications may need additional template logic using `.app.spec.sources`.
