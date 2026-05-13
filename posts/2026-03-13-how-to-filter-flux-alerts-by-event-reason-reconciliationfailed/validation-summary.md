# Validation Summary: How to Filter Flux Alerts by Event Reason ReconciliationFailed

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller
- Kubernetes custom resources
- Flux Alert and Provider resources
- Slack notifications
- kubectl
- Flux CLI

## Sources Consulted
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Providers documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Events documentation: https://fluxcd.io/flux/components/notification/events/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux CLI `flux get alerts` documentation: https://fluxcd.io/flux/cmd/flux_get_alerts/

## Issues Found
- The post claimed Flux `Alert.spec.inclusionList` can filter by event reason and used `.*ReconciliationFailed.*` as the key filter. Flux documentation states that `inclusionList` and `exclusionList` match event message content, while reason is a separate event field. Updated the post to explain that Flux Alert does not have a dedicated reason selector and to use `eventSeverity: error` with `eventSources` for failure notifications.
- The Alert and Provider examples used `notification.toolkit.fluxcd.io/v1`. Current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3` for Alert and Provider resources. Updated all Alert and Provider manifests to `v1beta3`.
- The prerequisite said Flux v2.0 or later, but the corrected examples use the current `notification.toolkit.fluxcd.io/v1beta3` API. Updated the prerequisite to require the v1beta3 notification APIs.
- The Slack legacy webhook example included a `channel` field while the current Flux legacy Slack webhook example uses a Secret containing the webhook `address` and a Slack Provider referencing that Secret. Removed the channel field from the webhook example.

## Review Notes
Flux can expose the event `reason` downstream in provider-specific payloads or labels, such as the `reason` label for Prometheus Alertmanager notifications. That can be used for reason-level routing outside Flux, but it is not a Flux Alert `inclusionList` filter.
