# Validation Summary: How to Configure Flux Alert with Inclusion Regex Pattern

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Kubernetes
- GitOps
- Flux notification-controller Alert resources
- Go regular expressions
- kubectl
- Flux CLI

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Event documentation: https://fluxcd.io/flux/components/notification/events/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Go regexp syntax documentation: https://pkg.go.dev/regexp/syntax

## Issues Found
- The Alert YAML examples used `apiVersion: notification.toolkit.fluxcd.io/v1`. The current Flux documentation lists `Alert` under `notification.toolkit.fluxcd.io/v1beta3`; the `v1` notification API reference covers `Receiver`, not `Alert`. Updated all Alert examples to `notification.toolkit.fluxcd.io/v1beta3`.
- Several `inclusionList` examples matched Flux event reason strings such as `ReconciliationSucceeded`, `ReconciliationFailed`, `ValidationFailed`, `HealthCheckFailed`, `PruneFailed`, and `ArtifactUpToDate`. Flux documents `inclusionList` as matching event message content, while event reason is a separate field. Updated the examples and surrounding text to match likely message content such as `succeeded`, `reconciliation finished`, `failed`, `validation error`, `health check`, `prune`, and `artifact up-to-date`.
- The resource-name filtering section implied that Flux object names should be filtered through message text. Added a clarification that `eventSources.name` should be used when filtering by the involved Flux object name itself.
- The conclusion referred to filtering by event reason. Updated it to describe filtering by message text and message content.

## Review Notes
- `eventSeverity: info`, `eventSources`, `providerRef`, `inclusionList`, `exclusionList` behavior, Go inline regex flags, `flux reconcile kustomization <name> --with-source`, and the `kubectl` commands were checked and are technically sound.
- The exact emitted message text can vary by Flux controller and resource type, so users should still verify against their own notification-controller events before relying on highly specific message regexes.
