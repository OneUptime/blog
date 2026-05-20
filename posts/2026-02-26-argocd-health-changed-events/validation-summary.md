# Validation Summary: How to Handle Application Health Changed Events

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD Notifications
- Kubernetes Deployments
- Kubernetes resource health checks
- Slack notifications
- Webhook notifications
- Prometheus-style metrics collection
- Python HTTP automation with requests

## Sources Consulted
- Argo CD Notifications triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD Notifications templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD Slack notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD webhook notification service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The Slack notification templates used undocumented fields such as `channel`, `title`, `text`, and `color` directly under `slack`. Updated them to use documented `message` and `slack.attachments` fields.
- Slack subscription annotations had empty recipients. Updated the Slack annotations to include recipient channel names, while keeping the webhook subscription empty as shown in Argo CD's webhook subscription docs.
- The notification ConfigMap used Slack templates but did not define `service.slack`. Added the documented Slack service configuration with `token: $slack-token`.
- The recovery trigger attempted to infer a recent recovery using `app.status.reconciledAt`. Simplified it to the documented trigger style based on the current health status.
- The self-healer Deployment selector did not match any pod template labels. Added `spec.template.metadata.labels` so the Deployment is accepted and manages its pods correctly.
- The self-healer used an Argo CD API URL without an HTTP scheme. Updated `ARGOCD_SERVER` to `https://argocd-server.argocd.svc`.
- The Python snippet referenced environment variables without defining them. Added `os.environ` reads for `ARGOCD_SERVER` and `ARGOCD_TOKEN`.
- The rollback workflow omitted the Argo CD automated sync caveat. Added a concise comment noting that rollback requires automated sync to be disabled.
- The health customization text said only custom resources while the example overrides a built-in Deployment health check. Updated the text to mention both custom resources and built-in overrides.
- The Lua health script could return without setting `hs.status` when `obj.status` is absent. Added a default `Progressing` status.
- The severity-routing examples used dot access for labels. Updated them to bracket access for Kubernetes label keys.
- The metrics section described direct transition export even though Argo CD Notifications exposes the current application object, not a previous health state. Clarified that a downstream collector can calculate transitions by comparing current and stored status.

## Review Notes
The examples are now aligned with current Argo CD notification, webhook, subscription, and health customization documentation. The self-healer code remains intentionally simplified and still depends on helper functions such as `is_still_degraded` and `notify` being implemented by the reader.
