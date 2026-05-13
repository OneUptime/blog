# Validation Summary: How to Filter Flux Alerts by Event Severity Error Only

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux notification-controller
- Flux Alert and Provider APIs
- Kubernetes custom resources
- Flux CLI
- PagerDuty notifications

## Sources Consulted
- Flux Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Provider documentation: https://fluxcd.io/flux/components/notification/providers/
- Flux notification API reference v1beta3: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux notification API reference v1: https://fluxcd.io/flux/components/notification/api/v1/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux GitRepository documentation: https://fluxcd.io/flux/components/source/gitrepositories/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux CLI create kustomization documentation: https://fluxcd.io/flux/cmd/flux_create_kustomization/

## Issues Found
- The post used `notification.toolkit.fluxcd.io/v1` for Alert and Provider resources. Current Flux documentation defines Alert and Provider under `notification.toolkit.fluxcd.io/v1beta3`, while `notification.toolkit.fluxcd.io/v1` currently documents Receiver. Updated all Alert and Provider examples to `notification.toolkit.fluxcd.io/v1beta3` and adjusted the prerequisite wording accordingly.
- The error event list implied source fetch failures are reported as `ArtifactFailed`. Flux source-controller resources use source-specific reasons such as `GitOperationFailed`, `AuthenticationFailed`, `IndexationFailed`, and `OCIArtifactPullFailed`. Updated the list to distinguish Kustomization/HelmRelease artifact errors from source-controller fetch failures.
- The list included `ValidationFailed`, which is not listed in the current Flux Kustomization failure reasons checked in the official docs. Removed it from the example error list.

## Review Notes
The `eventSeverity: error` and `eventSeverity: info` behavior, Alert `eventSources` structure, PagerDuty Provider fields, and `flux create kustomization` flags match the official Flux documentation. The local environment did not have the `flux` CLI installed, so CLI verification was performed against the official Flux CLI documentation.
