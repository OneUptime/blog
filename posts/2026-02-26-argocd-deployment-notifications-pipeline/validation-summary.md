# Validation Summary: How to Implement Deployment Notifications Pipeline

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps, Secrets, and Application annotations
- Slack notifications
- PagerDuty Events API v2 notifications
- Email notifications over SMTP
- Webhook notifications
- GitHub commit statuses

## Sources Consulted
- Argo CD Notifications overview: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/
- Argo CD notification triggers: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD notification templates: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD notification subscriptions: https://argo-cd.readthedocs.io/en/stable/user-guide/subscriptions/
- Argo CD Slack notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/slack/
- Argo CD Email notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/email/
- Argo CD Webhook notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD PagerDuty V2 notification service: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/pagerduty_v2/
- Argo CD v2.2 to v2.3 upgrade notes: https://argo-cd.readthedocs.io/en/stable/operator-manual/upgrading/2.2-2.3/
- Kubernetes kubectl create secret generic reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_secret_generic/

## Issues Found

1. **Incorrect bundled version claim**: Changed the statement that Argo CD Notifications is included in ArgoCD v2.5+ to v2.3+, matching the Argo CD upgrade notes that Notifications became bundled in the v2.3 release.

2. **PagerDuty service mixed legacy and v2 fields**: Replaced the legacy `service.pagerduty` configuration with `service.pagerdutyv2` and `serviceKeys`, because the template fields used by the post (`summary`, `severity`, `source`) are PagerDuty Events API v2 fields.

3. **PagerDuty secret key was wrong for PagerDuty V2**: Changed the example secret from `pagerduty-token` to `pagerduty-key-production`, matching the `serviceKeys` reference pattern used by Argo CD's PagerDuty V2 service.

4. **PagerDuty templates used unsupported fields and severity values**: Changed `pagerduty` templates to `pagerdutyv2`, removed unsupported `details`, replaced invalid `severity: high` with supported `severity: warning`, and added supported `component`, `dedupKey`, and `url` fields.

5. **PagerDuty subscription annotations used the wrong service name and missing recipient**: Changed `.pagerduty: ""` annotations to `.pagerdutyv2: production`, because PagerDuty V2 uses the annotation recipient to select the configured service key.

6. **Webhook subscription annotations used the wrong custom service syntax**: Changed `notifications.argoproj.io/subscribe.<trigger>.webhook.status-dashboard` to `notifications.argoproj.io/subscribe.<trigger>.status-dashboard`, matching Argo CD's custom webhook annotation format.

7. **Trigger expressions did not safely access optional operation state**: Added optional chaining for `app.status?.operationState` in trigger conditions and `oncePer` expressions, matching Argo CD's guidance that `status.operationState` can be absent.

8. **Health recovery trigger could fail when `finishedAt` is absent**: Added a `finishedAt != nil` guard before parsing the timestamp.

9. **Email template used an unsupported `email.body` field**: Moved the email body into the top-level `message` field while keeping `email.subject`, matching the documented email template pattern.

## Review Notes
- The Slack, SMTP email service, generic webhook, and GitHub commit status webhook examples now align with the current Argo CD Notifications documentation.
- The GitHub commit status webhook example uses Argo CD's documented `repo.FullNameByRepoURL` helper and GitHub status endpoint pattern.
- The example remains a conceptual production pipeline and still requires real provider credentials, Slack bot channel membership, SMTP settings, and PagerDuty integration keys in a live cluster.
