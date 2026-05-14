# Validation Summary: How to Configure Multiple Alert Providers in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Kubernetes Custom Resources
- Kubernetes Secrets
- Slack notifications
- Microsoft Teams notifications
- PagerDuty notifications
- Generic webhooks

## Sources Consulted
- Flux notification-controller Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification-controller Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification-controller Alert CRD: https://raw.githubusercontent.com/fluxcd/notification-controller/main/config/crd/bases/notification.toolkit.fluxcd.io_alerts.yaml
- Flux notification-controller Provider CRD: https://raw.githubusercontent.com/fluxcd/notification-controller/main/config/crd/bases/notification.toolkit.fluxcd.io_providers.yaml

## Issues Found
- The examples used `notification.toolkit.fluxcd.io/v1`, but the current Flux notification-controller CRDs serve `v1beta3` as the storage API version and mark `v1beta2` as deprecated. Updated all `Provider` and `Alert` examples to `notification.toolkit.fluxcd.io/v1beta3`.
- The Slack examples used incoming webhook addresses while also trying to route to different Slack channels through `spec.channel`. Flux's current Slack provider documentation recommends Slack Bot tokens with `address: https://slack.com/api/chat.postMessage` for API-based posting. Updated the Slack secret and providers accordingly.
- The Microsoft Teams webhook placeholder used the older `outlook.office.com/webhook/...` style. Updated it to a workflow-style Logic Apps webhook placeholder consistent with current Flux Teams provider guidance.
- The post created a PagerDuty token secret but did not define a PagerDuty provider or alert, and Flux's PagerDuty provider uses `spec.address` plus `spec.channel` for the Events API v2 routing key. Replaced the unused secret with a PagerDuty provider and added a PagerDuty error alert.
- The generic webhook provider referenced `logger-webhook`, but the post did not create that secret. Added the missing `logger-webhook` secret creation command.

## Review Notes
- The local environment did not have `kubectl` or `flux` installed, so CLI behavior was verified against official command usage and documentation rather than local `--help` output.
- YAML snippets were parsed successfully after the fixes.
