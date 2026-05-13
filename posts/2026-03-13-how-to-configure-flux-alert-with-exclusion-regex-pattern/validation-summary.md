# Validation Summary: How to Configure Flux Alert with Exclusion Regex Pattern

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux
- Flux notification-controller
- Flux Alert custom resources
- Kubernetes custom resources
- Go regular expressions
- kubectl
- Flux CLI

## Sources Consulted
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Events documentation: https://fluxcd.io/flux/components/notification/events/
- Flux Notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/
- Flux installation prerequisites: https://fluxcd.io/flux/installation/

## Issues Found
- The Alert examples used `apiVersion: notification.toolkit.fluxcd.io/v1`, but the official Flux documentation shows Alert resources under `notification.toolkit.fluxcd.io/v1beta3`; the current `notification.toolkit.fluxcd.io/v1` API reference only lists Receivers. Updated all Alert snippets to `v1beta3`.
- The prerequisite listed Kubernetes `v1.25 or later`, which is no longer accurate for current Flux documentation. Replaced it with a version-neutral requirement to use a Kubernetes cluster supported by the installed Flux version.
- Several exclusion examples matched Kubernetes event reasons such as `Progressing`, `DependencyNotReady`, and `ArtifactUpToDate`, but Flux documents `exclusionList` and `inclusionList` as matching event message content. Updated examples and explanation to use message patterns such as `Reconciliation in progress`, `Dependencies do not meet ready condition`, and `artifact up-to-date`.
- The production example used `.spec.summary`, which the Flux Alerts documentation marks as deprecated in favor of `.spec.eventMetadata.summary` or annotations. Updated the example and surrounding explanation to use `eventMetadata.summary`.
- The explanation of combining inclusion and exclusion implied a strict evaluation order. Flux documents the behavior as inclusion permitting matching messages while exclusion still discards matching messages because exclusion takes precedence. Updated the wording accordingly.

## Review Notes
The `flux reconcile kustomization flux-system --with-source` command and `--with-source` flag match the official Flux CLI documentation. Local `flux` and `kubectl` binaries were not installed in the review environment, so CLI validation was performed against official documentation rather than local help output.
