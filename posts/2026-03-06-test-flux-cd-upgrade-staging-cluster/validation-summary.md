# Validation Summary: How to Test Flux CD Upgrade in a Staging Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- GitOps
- Helm Controller and HelmRelease
- Kustomize Controller and Kustomization
- Flux image automation controllers
- kind
- eksctl
- GitHub Actions

## Sources Consulted
- Flux installation documentation: https://fluxcd.io/flux/installation/
- Flux CLI installation documentation: https://fluxcd.io/flux/cmd/
- `flux install` command reference: https://fluxcd.io/flux/cmd/flux_install/
- `flux bootstrap github` command reference: https://fluxcd.io/flux/cmd/flux_bootstrap_github/
- `flux check` command reference: https://fluxcd.io/flux/cmd/flux_check/
- `flux get all` command reference: https://fluxcd.io/flux/cmd/flux_get_all/
- `flux get sources all` command reference: https://fluxcd.io/flux/cmd/flux_get_sources_all/
- `flux get images all` command reference: https://fluxcd.io/flux/cmd/flux_get_images_all/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux v2.2.0 release install manifest: https://github.com/fluxcd/flux2/releases/download/v2.2.0/install.yaml
- Current Flux release install manifest: https://github.com/fluxcd/flux2/releases/latest/download/install.yaml

## Issues Found
- The post used `kubectl get crds | grep fluxcd`, which would not match Flux CRD names such as `helmreleases.helm.toolkit.fluxcd.io`. Changed the filter to `grep toolkit.fluxcd.io`.
- The post used `flux get image all -A`, but the documented Flux command is `flux get images all -A`. Updated the command.
- The resource replication script exported HelmCharts, image automation resources, alerts, and providers but only applied some of the exported files. Updated the loop so the exported Flux resource files are cleaned and applied consistently.
- The resource cleanup script did not remove `metadata.managedFields`, which is cluster-generated metadata. Added removal alongside `resourceVersion`, `uid`, `creationTimestamp`, and `status`.
- The examples validate image automation resources, but `flux install` and `flux bootstrap github` only install the default controllers unless extra components are specified. Added `--components-extra=image-reflector-controller,image-automation-controller` to the relevant install/bootstrap examples.

## Review Notes
The HelmRelease test manifest uses `helm.toolkit.fluxcd.io/v2`, which is correct for current Flux releases but is not served by the Flux v2.2.0 CRD. Because this test is run after the upgrade, it is valid as written. For real rollback testing from a newer Flux release to v2.2.0, teams should also account for any resources that have already been migrated to APIs not served by the older CRDs.
