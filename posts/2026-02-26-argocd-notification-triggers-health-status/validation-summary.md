# Validation Summary: How to Configure Notification Triggers Based on Health Status in ArgoCD

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Kubernetes
- kubectl
- Slack and PagerDuty notification subscriptions

## Sources Consulted
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification subscription documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD notification template documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Slack notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Rollout health customization source: https://raw.githubusercontent.com/argoproj/argo-cd/master/resource_customizations/argoproj.io/Rollout/health.lua
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Kubernetes `kubectl delete` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes `kubectl set image` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/

## Issues Found
- The Suspended health description included HPA scale-to-zero as an example. Official Argo CD health documentation cites suspended Jobs and paused Deployments, and Argo Rollouts maps paused rollouts to Suspended. Updated the wording to those supported examples.
- The `oncePer` explanation for degraded alerts said the same revision would alert again after recovery. `oncePer` deduplicates by the configured value, so the same health/revision key will not alert again. Updated the explanation.
- The Progressing trigger used `app.status.operationState.startedAt` without optional chaining. Argo CD documents `status.operationState` as optional in notification expressions. Updated it to `app.status?.operationState.startedAt`.
- The Progressing Slack template dereferenced `operationState.startedAt` directly even though `operationState` may be absent. Added a template guard that renders `unknown` when the field is unavailable.
- Environment label triggers accessed `app.metadata.labels['env']` without checking that labels exist. Added `app.metadata.labels != nil` checks to avoid expression evaluation failures.
- The stuck Progressing trigger manually checked `operationState` but then dereferenced it directly. Updated it to use Argo CD's documented optional chaining form.
- The verification commands claimed scaling a Deployment to zero would trigger Missing/Degraded. A deleted managed resource is the reliable way to trigger Missing, and a bad image is a better test for Degraded/Progressing. Updated the commands accordingly.
- The health flapping note implied duplicate alerts would still be sent for the same `oncePer` key. Updated it to explain that `oncePer` prevents duplicates for the same deduplication key and that stable keys should be chosen deliberately.
- The CRD health check link pointed to the sync-status trigger article instead of a custom health-check article. Corrected the URL.

## Review Notes
The trigger, template, Slack attachment, and subscription formats match current Argo CD Notifications documentation. The examples are still version-general; behavior can vary for custom resources and third-party controllers depending on whether Argo CD has a built-in or configured custom health check for that resource type.
