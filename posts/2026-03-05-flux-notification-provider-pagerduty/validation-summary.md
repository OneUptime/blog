# Validation Summary: How to Configure Flux Notification Provider for PagerDuty

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes manifests and kubectl
- PagerDuty Events API v2
- PagerDuty services and integration keys
- Flux CLI

## Sources Consulted
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- PagerDuty Dynamic Notifications and severity documentation: https://support.pagerduty.com/main/docs/dynamic-notifications

## Issues Found
- The Provider and Alert examples used `notification.toolkit.fluxcd.io/v1`, but the current Flux notification API reference documents Provider and Alert under `notification.toolkit.fluxcd.io/v1beta3`; the `v1` notification API reference currently covers Receiver. Updated all Provider and Alert snippets to `v1beta3`.
- The post stored the PagerDuty integration key in a Kubernetes Secret under `token`, but Flux's PagerDuty Provider documentation uses `spec.channel` as the PagerDuty routing key and `spec.address` for the PagerDuty Events API endpoint. Removed the incorrect Secret-based configuration and updated Provider examples to use `address: https://events.pagerduty.com` and `channel: <integration key>`.
- The post described the Provider `channel` field as PagerDuty event severity. Flux documents `channel` for PagerDuty as the routing key, while PagerDuty severity comes from the event payload. Reworked the severity section to explain Flux Alert `eventSeverity` filtering instead.
- The separate production and staging Provider examples used `channel: critical` and `channel: warning` plus Secret references, which would not route events to PagerDuty integrations. Updated those Providers to use environment-specific PagerDuty integration keys in `channel`.
- The troubleshooting section referred to a Secret `token` key and Secret namespace alignment. Updated those notes to match the corrected Provider and Alert configuration.

## Review Notes
- The `flux reconcile kustomization flux-system --with-source` command matches the official Flux CLI syntax, assuming a Kustomization named `flux-system` exists in the default Flux namespace.
- PagerDuty's documented severity values are `critical`, `error`, `warning`, and `info`; Flux forwards event severity to PagerDuty, while `eventSeverity: error` filters Flux notifications to error events only.
