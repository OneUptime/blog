# Validation Summary: How to Route Alerts to Different Channels Based on Severity in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD notification-controller
- Flux Provider and Alert custom resources
- Kubernetes manifests and kubectl
- Flux CLI
- Slack notifications
- PagerDuty notifications

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux CLI `flux create kustomization` documentation: https://fluxcd.io/flux/cmd/flux_create_kustomization/
- Flux CLI `flux delete kustomization` documentation: https://fluxcd.io/flux/cmd/flux_delete_kustomization/

## Issues Found
- The post used `apiVersion: notification.toolkit.fluxcd.io/v1` for Flux Provider and Alert resources. Current official Flux notification examples use `notification.toolkit.fluxcd.io/v1beta3`, so all Provider and Alert examples were updated to `v1beta3`.
- The PagerDuty provider example used `type: generic` with a webhook secret. Flux has a dedicated `pagerduty` provider type that formats PagerDuty Events API v2 payloads, using `address: https://events.pagerduty.com` and `channel: <integrationKey>`. The provider example was corrected accordingly.

## Review Notes
The severity routing explanation is accurate: Flux `spec.eventSeverity: info` forwards all events including errors, while `error` forwards only error events. The `eventSources`, `exclusionList`, and Flux CLI examples align with the official documentation.
