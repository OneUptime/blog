# Validation Summary: How to Fix Flux CD Notification Provider Not Sending Alerts

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes Secrets and kubectl
- Slack incoming webhooks and Slack API notifications
- Microsoft Teams webhooks
- Generic HTTP webhooks

## Sources Consulted
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux CLI `flux suspend kustomization` reference: https://fluxcd.io/flux/cmd/flux_suspend_kustomization/
- Flux CLI `flux reconcile kustomization` reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux get alert-providers` reference: https://fluxcd.io/flux/cmd/flux_get_alert-providers/
- Flux CLI `flux get alerts` reference: https://fluxcd.io/flux/cmd/flux_get_alerts/
- Slack incoming webhooks documentation: https://api.slack.com/incoming-webhooks

## Issues Found
- The Provider and Alert examples used `apiVersion: notification.toolkit.fluxcd.io/v1`. Current Flux documentation lists Provider and Alert under `notification.toolkit.fluxcd.io/v1beta3`; the `v1` notification API reference contains Receiver, not Provider or Alert. Updated all Provider and Alert snippets to `v1beta3`.
- The Slack provider snippet said `channel` overrides the webhook default. Slack's current incoming webhook documentation says modern incoming webhooks cannot override the default channel, while Flux supports `channel` for Slack API/bot-token usage and legacy webhooks that honor it. Updated the comment to avoid claiming a universal override.
- The `exclusionList` comment said it matched labels, but Flux documents `exclusionList` as Go regular expressions matched against event messages. Updated the wording to say messages/regexes.
- The final checklist tested webhook connectivity with a GET request. Slack and generic Flux webhook examples require an HTTP POST payload. Updated the command to POST a small JSON test message with `Content-Type: application/json`.

## Review Notes
The remaining kubectl and Flux CLI examples align with current Flux CLI documentation. The post uses legacy Slack incoming webhook style, which Flux still documents, but Flux recommends Slack bot tokens with `https://slack.com/api/chat.postMessage` for new Slack integrations.
