# Validation Summary: How to Configure Flux Notification Provider for Datadog

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Flux CD notification-controller
- Flux `Provider` and `Alert` custom resources
- Kubernetes Secrets and `kubectl`
- Flux CLI reconciliation commands
- Datadog Events and dashboard overlays

## Sources Consulted
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux CLI `reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Datadog API documentation, Events: https://docs.datadoghq.com/api/latest/events/
- Datadog API documentation, Using the API / sites: https://docs.datadoghq.com/api/latest/using-the-api/
- Datadog Timeseries widget documentation: https://docs.datadoghq.com/dashboards/widgets/timeseries/
- Datadog Events usage guide: https://docs.datadoghq.com/events/guides/usage/

## Issues Found
- The Flux `Provider` and `Alert` examples used `apiVersion: notification.toolkit.fluxcd.io/v1`. Current Flux documentation uses `notification.toolkit.fluxcd.io/v1beta3` for `Provider` and `Alert`; the v1 notification API reference currently documents `Receiver`, not `Provider` or `Alert`. Updated all `Provider` and `Alert` snippets to `v1beta3`.
- The post referred to Datadog's "event stream" terminology. Datadog's current documentation refers to Events Explorer / Event Management. Updated the relevant text and diagram label to use Events Explorer.
- The dashboard section said to add an "Event Overlay widget." Datadog documents event overlays as a configuration section on timeseries widgets, not a standalone widget. Updated the instruction to use the Event Overlays section in a Datadog timeseries widget.

## Review Notes
The Flux `flux reconcile kustomization flux-system --with-source` command and `--with-source` flag are valid. The Datadog provider secret key `token`, use of a Datadog API key rather than an application key, same-namespace `secretRef`, `eventSeverity` values, and wildcard event source examples align with Flux documentation. Datadog's newer v2 Events API uses `event-management-intake` hostnames for direct API publishing, but Flux's official Datadog provider example still uses `https://api.datadoghq.com` as the provider address, so the post's Flux provider endpoint remains consistent with Flux documentation.
