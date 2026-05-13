# Validation Summary: How to Deploy Microservices with Shared HelmRelease Values in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux HelmRelease
- Flux HelmRepository
- Kubernetes ConfigMap
- Kubernetes Secret
- Helm CLI
- GitOps

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux CLI `reconcile helmrelease` documentation: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Flux guide for managing Helm releases: https://fluxcd.io/flux/guides/helmreleases/
- Helm CLI `helm get values` documentation: https://helm.sh/docs/helm/helm_get_values/

## Issues Found
- The ConfigMap example said data key names must match Helm value paths. Flux's `valuesKey` points to a `.data` key in the referenced ConfigMap or Secret, so the comment was corrected to explain that `values.yaml` matches the HelmRelease `valuesKey`.
- The verification commands used `helm get values backend-api -n microservices` and `helm get values auth-service -n microservices`, but Flux defaults the Helm release name from the target namespace and HelmRelease name, and defaults Helm storage to the HelmRelease namespace. Added explicit `releaseName` and `storageNamespace` fields to both HelmRelease examples so the commands are correct.
- The post described ConfigMap updates being picked up on reconciliation but did not include Flux's recommended watch label for immediate reactions to referenced ConfigMap and Secret changes. Added `reconcile.fluxcd.io/watch: Enabled` labels to both shared resources and updated the propagation text accordingly.

## Review Notes
The examples assume the `microservices` namespace already exists and that the referenced chart supports the shown values such as `resources`, `imagePullSecrets`, `podAnnotations`, `nodeSelector`, `podSecurityContext`, `tolerations`, `image`, `replicaCount`, `service`, `ingress`, and `env`. These are common chart conventions, but the exact value schema is chart-specific.
