# Validation Summary: How to Send ArgoCD Notifications to PagerDuty

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Argo CD Notifications
- Kubernetes ConfigMaps, Secrets, and annotations
- PagerDuty Events API v2
- Argo CD notification webhook service
- Go template / Sprig template functions

## Sources Consulted
- Argo CD notification webhook service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD notification templates documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/templates/
- Argo CD notification subscriptions documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/subscriptions/
- Argo CD PagerDuty V2 service documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/pagerduty_v2/
- Argo Project notifications-engine PagerDuty V2 implementation: https://github.com/argoproj/notifications-engine/blob/master/pkg/services/pagerdutyv2.go
- PagerDuty Events API v2 documentation: https://developer.pagerduty.com/api-reference/368ae3d938c9e-send-an-event-to-pager-duty

## Issues Found
- The original post configured `service.pagerduty` and used a `pagerduty:` template with raw Events API v2 fields such as `routing_key`, `event_action`, `dedup_key`, `payload`, and `custom_details`. Argo CD's native legacy `pagerduty` service does not use those fields, and the native `pagerdutyv2` service supports a different template shape and only builds trigger events. Updated the main configuration and templates to use `service.webhook.pagerduty` and raw PagerDuty Events API v2 JSON bodies.
- The auto-resolve examples used `event_action: resolve` under the unsupported native `pagerduty:` template. Updated them to send valid PagerDuty Events API v2 resolve events through the webhook service, with matching `dedup_key` values.
- The templates referenced the integration key as `$pagerduty-integration-key` inside webhook request bodies. Argo CD templates should access secrets through the `secrets` template variable, so the examples now use `{{ index .secrets "pagerduty-integration-key" | toJson }}`.
- The original JSON bodies interpolated application fields directly inside quoted strings. Updated dynamic values to use Sprig `toJson` and `printf` so the generated JSON remains valid when values contain quotes or other special characters.
- The sync triggers accessed `app.status.operationState.phase` without checking whether `operationState` exists. Added `app.status.operationState != nil` guards consistent with Argo CD's notification trigger catalog.
- The PagerDuty integration key was described as a 32-character hex string. PagerDuty documents this value as the Events API v2 integration or routing key, so the wording and placeholder were generalized.

## Review Notes
- Argo CD's native `pagerdutyv2` service is appropriate for simple trigger-only PagerDuty alerts. The webhook approach used in the corrected post is necessary for the post's auto-resolve and `custom_details` examples.
