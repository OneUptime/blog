# Validation Summary: How to Debug Notification Delivery Failures in ArgoCD

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes
- kubectl
- jq
- Slack Web API
- SMTP connectivity checks

## Sources Consulted
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD Notifications triggers and oncePer: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications subscriptions: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/subscriptions/
- Argo CD notification service configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/overview/
- Argo CD Slack notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD command parameters ConfigMap reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cmd-params-cm-yaml/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Slack Web API reference: https://api.slack.com/web
- Slack chat.postMessage reference: https://api.slack.com/methods/chat.postMessage
- Argo notifications-engine source for notification state annotations: https://github.com/argoproj/notifications-engine

## Issues Found
- The Step 1 expected `kubectl get pods` output omitted the `AGE` column normally shown by kubectl. Updated the sample output to include `AGE`.
- The post said the notifications controller stores deduplication state in `argocd-notifications-secret`. Argo CD uses `argocd-notifications-secret` for sensitive service configuration, while sent-notification state is stored on the Application annotation `notified.notifications.argoproj.io`. Updated the command to inspect that annotation.
- Subscription annotation inspection commands failed when `.metadata.annotations` was absent. Updated the jq expressions to use an empty object fallback.
- The temporary connectivity pods used `kubectl run` without `--restart=Never` and without explicitly setting the command. Updated the examples to match current kubectl command semantics.
- The `oncePer` examples accessed `operationState` without optional chaining, even though that field can be absent. Updated trigger expressions to use `app.status?.operationState`.
- The debug logging section instructed readers to replace deployment args with `--loglevel=debug`, which can be incorrect for current Argo CD manifests. Updated it to set `notificationscontroller.log.level` in `argocd-cmd-params-cm` and restart the notifications controller.
- The post stated that the controller logs every delivery attempt at normal logging levels. Adjusted the wording to distinguish delivery errors from debug-level delivery attempt details.

## Review Notes
The guide is version-neutral and does not pin a specific Argo CD release. The corrected commands align with current stable Argo CD and Kubernetes documentation as of 2026-05-20.
