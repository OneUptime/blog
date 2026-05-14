# Validation Summary: How to Use Flux Operator for Managing Flux Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux Operator
- FluxInstance custom resources
- Kubernetes
- Helm
- Kustomize patches
- Flux notification-controller Alerts
- Flux multi-tenancy

## Sources Consulted
- Flux Operator installation guide: https://fluxoperator.dev/docs/guides/install/
- Flux Operator FluxInstance CRD reference: https://fluxoperator.dev/docs/crd/fluxinstance/
- Flux CD installation documentation: https://fluxcd.io/flux/installation/
- Flux kustomize-controller options: https://fluxcd.io/flux/components/kustomize/options/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux notification-controller Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Operator source and generated CRDs: https://github.com/controlplaneio-fluxcd/flux-operator

## Issues Found
- The prerequisites specified Kubernetes v1.26 or later, which is stale for current Flux 2.x documentation. Updated the wording to require a Kubernetes version supported by the target Flux release.
- The feature list claimed multi-instance support for tenants or environments and automated rollback on failed upgrades. FluxInstance is constrained to a single `flux` object per cluster, and the operator documents health checks/status rather than generic rollback behavior. Updated those claims.
- The FluxInstance creation text did not mention the required `flux` name and operator namespace placement. Added that requirement.
- The multi-tenancy example created a `flux-reconciler` ServiceAccount but configured controllers to use `default`. Updated the FluxInstance to use `tenantDefaultServiceAccount: flux-reconciler` and aligned the example controller flags.
- Version pinning examples used older 2.4 ranges. Updated examples to current 2.8 patch-range examples.
- The fleet overlay referenced `../base` without showing a base kustomization and patched `/spec/kustomize/patches/-` even though the base omitted `spec.kustomize`. Updated the resource path and initialized `kustomize.patches`.
- The Alert example used `notification.toolkit.fluxcd.io/v1`, but current Alert storage API is `v1beta3`. Updated the API version.
- The uninstall section only deleted the FluxInstance CRD. Updated it to include the current Flux Operator CRDs.
- The troubleshooting command described `helm show chart` as listing available Flux versions, but it shows the Flux Operator chart metadata. Corrected the comment.

## Review Notes
Validated the YAML fenced examples for syntax after edits. The guide remains high-level and assumes supporting resources such as the referenced `slack-provider` already exist.
