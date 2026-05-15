# Validation Summary: How to Configure Flux Alerts for Drift Detection Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux notification-controller Alert API
- Flux kustomize-controller Kustomization API
- Flux helm-controller HelmRelease drift detection
- Kubernetes events
- kubectl
- Flux CLI

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux monitoring alerts guide: https://fluxcd.io/flux/monitoring/alerts/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease drift detection documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI `flux reconcile kustomization` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_kustomization/

## Issues Found
- The verification step said to manually modify any Flux-managed resource. Flux's default server-side apply behavior reverts changes to fields declared in the desired manifests, but fields not owned by Flux may be preserved. Changed the wording to specify manually modifying a field declared in Git on a Flux-managed resource.

## Review Notes
- The Alert examples use the current `notification.toolkit.fluxcd.io/v1beta3` API and valid fields: `providerRef`, `eventSeverity`, `eventSources`, and `exclusionList`.
- `eventSeverity: info` is technically correct for these examples because Flux forwards all events, including errors, when severity is `info`.
- HelmRelease drift correction requires `.spec.driftDetection.mode: enabled`; `warn` only detects and reports drift. The post correctly uses `enabled`.
- The exclusion filters are examples and may need tuning for a real cluster because Flux event messages can vary by controller version and workload.
