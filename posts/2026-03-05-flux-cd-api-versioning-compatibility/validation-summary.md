# Validation Summary: How to Understand Flux CD API Versioning and Compatibility

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Flux CD
- Kubernetes Custom Resource Definitions
- Kubernetes API versioning and deprecation
- Flux source-controller, kustomize-controller, helm-controller, notification-controller, image-reflector-controller, and image-automation-controller
- Kustomize overlays and JSON patches
- Flux CLI and kubectl

## Sources Consulted
- Flux v2.8 release announcement: https://fluxcd.io/blog/2026/02/flux-v2.8.0/
- Flux release and compatibility documentation: https://fluxcd.io/flux/releases/
- Flux controller API versioning documentation: https://fluxcd.io/flux/releases/controllers/
- Flux upgrade documentation: https://fluxcd.io/flux/installation/upgrade/
- Flux `flux migrate` command documentation: https://fluxcd.io/flux/cmd/flux_migrate/
- Flux `flux version` command documentation: https://fluxcd.io/flux/cmd/flux_version/
- Flux source API v1 reference: https://fluxcd.io/flux/components/source/api/v1/
- Flux kustomize API v1 reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux helm API v2 reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux notification API v1beta3 reference: https://fluxcd.io/flux/components/notification/api/v1beta3/
- Flux image reflector API v1 reference: https://fluxcd.io/flux/components/image/reflector-api/v1/
- Flux image automation API v1 reference: https://fluxcd.io/flux/components/image/automation-api/v1/
- Kubernetes deprecation policy: https://kubernetes.io/docs/reference/using-api/deprecation-policy/

## Issues Found
- The post stated that Flux logs warnings whenever deprecated API versions are used. I changed this to explain that Kubernetes API server returns deprecation warning headers, while Flux controllers may surface those warnings during reconciliation.
- The post implied Flux notification Alerts can directly alert on deprecated API usage. I clarified that notification-controller alerts on Flux `Warning` events, while API server deprecation warnings should be tracked through manifest checks, audit logs, or the `apiserver_requested_deprecated_apis` metric.
- The deprecated API scanning script omitted deprecated `image.toolkit.fluxcd.io/v1beta2` and `notification.toolkit.fluxcd.io/v1beta2` APIs. I added both to the list.
- The migration guidance did not mention the official `flux migrate` command introduced for migrating Flux resources to current API versions. I added a short note in the existing migration section.

## Review Notes
The current API version examples are accurate for Flux v2.8: source, kustomize, helm, and image APIs use stable versions where shown, while notification remains `v1beta3`. The HelmRelease `valuesFile` to `valuesFiles` migration example matches Flux's documented Helm v2 API changes.
