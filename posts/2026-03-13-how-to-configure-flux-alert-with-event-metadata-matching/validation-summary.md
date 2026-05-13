# Validation Summary: How to Configure Flux Alert with Event Metadata Matching

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux notification-controller
- Flux Alert and Provider resources
- Kubernetes custom resources
- kubectl
- Flux CLI

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Events documentation: https://fluxcd.io/flux/components/notification/events/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux CLI `flux events` documentation: https://fluxcd.io/flux/cmd/flux_events/

## Issues Found
- The post described `spec.eventMetadata` as a filtering or matching mechanism. Flux documentation defines it as metadata added to events dispatched by the notification-controller, not as a filter. I rewrote the affected explanations and examples to use `eventSources.matchLabels` for object selection and `eventMetadata` for outgoing event context.
- The Alert examples used `apiVersion: notification.toolkit.fluxcd.io/v1`. Current Flux Alert documentation and the v1beta3 API reference show Alerts under `notification.toolkit.fluxcd.io/v1beta3`; the v1 notification API is for Receivers. I updated the Alert manifests to `v1beta3`.
- The post stated that Flux resource labels and annotations are carried through to event metadata. Flux documents user-defined event metadata from object annotations only when keys use the `event.toolkit.fluxcd.io/` prefix; labels are used for `eventSources.matchLabels` selection. I corrected the resource example and explanation.
- The examples used the deprecated `spec.summary` field. Flux documents `spec.summary` as deprecated in favor of `spec.eventMetadata.summary` or object annotations. I moved summary values into `eventMetadata`.
- The verification command inspected Kubernetes Event object annotations as if they represented Flux alert payload metadata. I replaced it with a command that verifies labels and annotations on the Flux resource being selected.
- The prerequisites listed Kubernetes v1.25 or later. Current Flux installation documentation lists supported Kubernetes versions starting at v1.33, while noting older EOL versions are not recommended or supported. I updated the prerequisite to refer to a Kubernetes version supported by the installed Flux version and mention the current v1.33-or-later baseline.

## Review Notes
The local environment did not have the Flux CLI installed, so CLI behavior was checked against the official Flux command documentation rather than local `--help` output. The corrected article now covers metadata enrichment plus label-based source matching, because Flux does not currently provide arbitrary filtering by event payload metadata in Alert specs.
