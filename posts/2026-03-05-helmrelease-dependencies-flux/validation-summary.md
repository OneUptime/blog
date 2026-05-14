# Validation Summary: How to Configure HelmRelease Dependencies in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux helm-controller
- Kubernetes
- Helm
- HelmRelease custom resources
- GitOps
- YAML configuration

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux helm-controller options: https://fluxcd.io/flux/components/helm/options/
- Flux CLI `flux get helmreleases` reference: https://fluxcd.io/flux/cmd/flux_get_helmreleases/

## Issues Found
- The post described `dependsOn` as primarily enforced during the initial install. Current Flux documentation states that `dependsOn` gates HelmRelease reconciliation until dependencies are Ready and that the helm-controller orders Helm install and upgrade actions using the dependency relationship. Updated the behavior note to describe install and upgrade ordering, while preserving the point that releases still reconcile on their own intervals.
- The post stated that cross-namespace dependencies can use the `namespace` field without mentioning controller policy. The Flux API supports the `namespace` field, but helm-controller can be configured with `--no-cross-namespace-refs=true`, which allows references only within the same namespace. Added that caveat.
- Tightened wording that said dependent releases are installed only after prerequisites are ready. Updated it to say releases proceed only after prerequisites are ready, matching Flux's reconciliation behavior more accurately.

## Review Notes
The YAML examples use the current `helm.toolkit.fluxcd.io/v2` HelmRelease API and valid `spec.dependsOn` fields. The `flux get helmreleases -A` command is valid; local `flux` and `kubectl` binaries were not installed in this workspace, so command verification was performed against official Flux CLI documentation rather than local `--help` output.
