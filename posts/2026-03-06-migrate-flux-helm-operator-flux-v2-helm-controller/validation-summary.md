# Validation Summary: How to Migrate from Flux Helm Operator to Flux v2 Helm Controller

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Flux CD v1 Helm Operator
- Flux CD v2 Helm Controller
- Flux Source Controller
- Kubernetes custom resources
- Helm releases and Helm chart repositories
- Flux CLI
- kubectl

## Sources Consulted
- Flux official migration guide: https://fluxcd.io/flux/migration/helm-operator-migration/
- Flux Helm releases guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux HelmRelease API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux Source API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux CLI install documentation: https://fluxcd.io/flux/cmd/
- Flux `flux install` command reference: https://fluxcd.io/flux/cmd/flux_install/

## Issues Found
- The migration flow originally said Flux v1 and Flux v2 could coexist during migration and applied the v2 HelmRelease while the v1 Helm Operator was still running. Flux's official migration guide warns that both controllers will fight over the same Helm release if both old and new HelmRelease resources point to it. Updated the guide to stop the v1 Helm Operator before applying converted HelmReleases.
- The v1 Git chart example used a scp-like Git URL and chart paths without `./`. Updated the example to use an SSH URL and `./charts/my-app`, matching Flux migration documentation examples for GitRepository chart paths.
- The `upgrade.cleanupOnFail` and `rollback.cleanupOnFail` comments were inaccurate. Updated them to describe that the fields clean up newly created resources when an upgrade or rollback action fails.
- The v1 deletion step claimed `--cascade=orphan` was used to prevent underlying resources from being deleted, but the command did not include the flag and the safer migration path is to delete old resources while the v1 operator is stopped. Removed the incorrect comment and clarified the ordering.
- The uninstall command used `flux-helm-operator` as the deployment name. Updated the example to `helm-operator`, consistent with the legacy Helm Operator naming used in Flux migration material.
- The "Release Already Exists" troubleshooting note overstated automatic adoption based only on release name. Updated it to mention matching `spec.releaseName`, `spec.targetNamespace`, and `spec.storageNamespace` when applicable.
- The `releaseName` comment omitted the `targetNamespace` defaulting behavior. Updated it to avoid implying that the default is always exactly `metadata.name`.

## Review Notes
- The post uses current Flux v2 API versions (`helm.toolkit.fluxcd.io/v2` and `source.toolkit.fluxcd.io/v1`) and the HelmRepository, GitRepository, and HelmRelease field structures are valid for current Flux documentation.
- The local environment did not have the `flux` CLI installed, so CLI validation was performed against official Flux command reference documentation.
