# Validation Summary: How to Filter Flux Alerts by Event Severity Info Only

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller
- Kubernetes custom resources
- Flux Alert and Provider resources
- Flux CLI
- kubectl

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux CLI `reconcile kustomization` reference: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux monitoring alerts guide: https://fluxcd.io/flux/monitoring/alerts/

## Issues Found
- The Alert and Provider YAML examples used `apiVersion: notification.toolkit.fluxcd.io/v1`. Current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3` for Alert and Provider resources, while the v1 notification API reference documents Receiver resources. Updated all Alert and Provider examples to `notification.toolkit.fluxcd.io/v1beta3`.
- The split-alerts section said that true info/error separation could be achieved with `inclusionList` regex patterns matching info-only messages. Flux documents `inclusionList` as a message-content filter, not a severity-only filter, and `eventSeverity: info` still includes errors. Updated the note to state that Flux Alerts do not provide an info-only severity setting, and that `inclusionList` can only be used to select known informational message text.

## Review Notes
The `eventSeverity` behavior, `eventSources` examples, `inclusionList` field name, and `flux reconcile kustomization flux-system` command are consistent with official Flux documentation. The post title says "Info Only", but the body now accurately explains that `eventSeverity: info` means all events, including errors.
