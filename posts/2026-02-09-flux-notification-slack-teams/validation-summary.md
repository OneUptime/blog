# Validation Summary: How to Configure Flux Notification Controller for Slack

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux notification-controller
- Flux CLI
- Kubernetes Secrets and custom resources
- Slack notifications
- Microsoft Teams notifications
- Discord notifications
- PagerDuty notifications
- Generic webhooks with HMAC

## Sources Consulted
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux alerting guide: https://fluxcd.io/flux/monitoring/alerts/
- Flux install command reference: https://fluxcd.io/flux/cmd/flux_install/
- Flux logs command reference: https://fluxcd.io/flux/cmd/flux_logs/
- Flux get alert-providers command reference: https://fluxcd.io/flux/cmd/flux_get_alert-providers/
- Flux reconcile kustomization command reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The post used `notification.toolkit.fluxcd.io/v1` for `Alert` and `Provider` resources. Current Flux documentation shows `v1` is for `Receiver`, while `Alert` and `Provider` use `notification.toolkit.fluxcd.io/v1beta3`. Updated all `Alert` and `Provider` manifests to `v1beta3`.
- The Slack examples used legacy incoming webhooks while also relying on `channel` routing. Flux recommends Slack bot tokens with `address: https://slack.com/api/chat.postMessage` for channel routing. Updated the Slack setup, Secret, and Provider examples to use a bot token.
- The Teams example used the old connector flow and set `spec.channel`, but Flux documents Teams incoming webhook workflows and notes that the `msteams` provider does not support `channel`. Updated the workflow wording, webhook URL shape, and Provider manifest.
- Several namespace-scoped `eventSources` omitted `name`. Flux Alert docs require `kind` and `name`, with `name: '*'` used to select all resources of a kind. Added `name: '*'` to those examples.
- The generic webhook example referenced a Secret token while using `type: generic`, which does not use that token for request authentication. Updated the Provider to `type: generic-hmac`.
- The Discord Provider included `channel`, but Flux documents that the Discord provider does not support channel configuration. Removed the field.
- The PagerDuty Provider incorrectly used a Secret token. Flux documents PagerDuty with `address: https://events.pagerduty.com` and `channel` set to the integration/routing key. Updated the Provider manifest.
- The post described `summary` as alert grouping, but Flux marks `.spec.summary` as deprecated and does not use it for grouping. Replaced the section with `eventMetadata.summary` context.
- The testing section claimed the annotation forces a notification. It triggers reconciliation; a notification depends on matching emitted events and Alert filters. Updated the comment.
- The failure-handling section used `flux logs --kind=provider --name=slack` and described an Alert retry policy. Updated the status command to `flux get alert-providers` and changed the retry-policy wording to enabling the Alert with `suspend: false`.

## Review Notes
- The post is now technically aligned with current Flux documentation as of 2026-06-04.
- `flux logs` is documented as a preview command, so `kubectl logs` remains the more stable controller log command shown in the post.
