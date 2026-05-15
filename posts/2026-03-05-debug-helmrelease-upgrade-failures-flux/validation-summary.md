# Validation Summary: How to Debug HelmRelease Upgrade Failures in Flux

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Flux CD
- Flux helm-controller
- Kubernetes HelmRelease custom resources
- Helm
- Kubernetes Secrets, Deployments, Services, PersistentVolumeClaims, Jobs, and ResourceQuotas

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux CLI `flux get helmreleases` reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/
- Helm storage backend documentation: https://helm.sh/docs/topics/advanced/#storage-backends
- Helm `history` command reference: https://helm.sh/docs/helm/helm_history/
- Helm `rollback` command reference: https://helm.sh/docs/helm/helm_rollback/
- Helm `status` command reference: https://helm.sh/docs/helm/helm_status/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- helm-diff plugin README: https://github.com/databus23/helm-diff

## Issues Found
- The status command used `flux get helmrelease my-app -n default`, but the documented Flux get command is `flux get helmreleases`. Updated the example to use `flux get helmreleases -n default | grep my-app`.
- The post said Flux stores Helm release history as Kubernetes Secrets. Helm stores release history as Secrets by default, while Flux uses Helm storage during reconciliation. Updated the wording to make that distinction accurate.
- The upgrade process description said Flux computes a diff against the previous release. Updated it to the more accurate explanation that Helm/Flux compare desired release state with the existing release and cluster state before applying changes.
- The common failure table recommended "skip hooks" and "disable validation" without naming the actual HelmRelease fields. Updated those fixes to reference `upgrade.disableHooks`, `upgrade.disableOpenAPIValidation`, and `upgrade.disableSchemaValidation`.

## Review Notes
The remaining commands and HelmRelease fields reviewed are current for Flux HelmRelease `apiVersion: helm.toolkit.fluxcd.io/v2`. `maxHistory` defaults to 5 in the Flux API, so explicitly setting it to 5 is valid but mostly documents the default.
