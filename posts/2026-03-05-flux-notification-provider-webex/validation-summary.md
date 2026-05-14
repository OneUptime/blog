# Validation Summary: How to Configure Flux Notification Provider for Webex

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes Secrets
- kubectl
- Flux CLI
- Cisco Webex Messaging API

## Sources Consulted
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/v1/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Webex Bots documentation: https://developer.webex.com/docs/bots
- Webex Rooms API documentation: https://developer.webex.com/messaging/docs/api/v1/rooms
- Webex API getting started documentation: https://developer.webex.com/messaging/docs/getting-started

## Issues Found
- The Provider and Alert examples used `apiVersion: notification.toolkit.fluxcd.io/v1`, but Flux's current Provider and Alert examples use `notification.toolkit.fluxcd.io/v1beta3`. Updated all Provider and Alert snippets to `v1beta3`.
- The Webex endpoint was stored in the Secret as `address`, while the official Flux Webex example sets `spec.address` to `https://webexapis.com/v1/messages` and stores the bot token in the Secret. Updated the Secret command to contain only `token`, added `address` to the Provider specs, and corrected the related troubleshooting note.
- The post referred to creating a Webex webhook or incoming webhook, but Flux's Webex provider uses a Webex bot token and room ID for outbound messages. Updated those references to avoid implying that a Webex webhook is required.

## Review Notes
The `flux reconcile kustomization flux-system --with-source` command and `eventSeverity` behavior are consistent with Flux documentation. The Webex bot membership note is important because Flux documents that missing room membership can produce 404 errors from the controller.
