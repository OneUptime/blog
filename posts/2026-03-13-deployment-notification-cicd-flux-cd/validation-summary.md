# Validation Summary: Deployment Notification in CI/CD with Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD Notification Controller
- Kubernetes Custom Resource Definitions
- Slack notifications
- PagerDuty Events API v2
- Microsoft Teams webhooks
- Generic webhook and HMAC notifications
- Flux CLI
- kubectl

## Sources Consulted
- Flux Notification Controller Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification Controller Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux monitoring alerts guide: https://fluxcd.io/flux/monitoring/alerts/
- Flux CLI `get alert-providers` reference: https://fluxcd.io/flux/cmd/flux_get_alert-providers/
- Flux CLI `reconcile kustomization` reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The Provider and Alert manifests used `notification.toolkit.fluxcd.io/v1`, but the official Flux documentation still documents Provider and Alert under `notification.toolkit.fluxcd.io/v1beta3`. Updated all Provider and Alert examples to `v1beta3`.
- The Slack legacy incoming webhook example included `spec.channel`, but Flux's legacy incoming webhook example stores only the webhook `address` in the referenced Secret and does not configure a channel on the Provider. Removed `channel` from that example.
- The PagerDuty Provider incorrectly used a Secret with a `token`. Flux's PagerDuty provider expects `address: https://events.pagerduty.com` and `channel` set to the PagerDuty integration/routing key. Updated the manifest and replaced the incorrect secret creation command with a note to set the integration key.
- The generic webhook example referenced an HMAC token while using `type: generic`. Flux uses `type: generic-hmac` when signing requests with an HMAC token. Updated the Provider type.
- The verification command used `flux get providers`, but the Flux CLI command is `flux get alert-providers`. Updated the command.

## Review Notes
- `spec.summary` is still accepted in the documented v1beta3 API, but it is deprecated in favor of `eventMetadata`. The post keeps `summary` because it remains valid and changing it throughout would be broader than a correctness fix.
- The Microsoft Teams example references a Secret containing the webhook `address`; users must create that Secret separately, following the same pattern as the Flux documentation.
