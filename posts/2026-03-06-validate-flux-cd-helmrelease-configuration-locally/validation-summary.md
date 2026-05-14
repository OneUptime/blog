# Validation Summary: How to Validate Flux CD HelmRelease Configuration Locally

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD HelmRelease
- Flux CLI
- Helm
- kubeconform
- yamllint
- yq
- GitHub Actions
- Bash
- Kubernetes YAML manifests

## Sources Consulted
- Flux HelmRelease v2 API reference: https://fluxcd.io/flux/components/helm/api/v2/
- Flux `flux build kustomization` command reference: https://fluxcd.io/flux/cmd/flux_build_kustomization/
- Flux CLI installation documentation: https://fluxcd.io/flux/cmd/
- Helm `helm template` command reference: https://helm.sh/docs/v3/helm/helm_template/
- kubeconform custom resource schema documentation: https://kubeconform.mandragor.org/docs/crd-support/
- kubeconform usage documentation: https://kubeconform.mandragor.org/docs/usage/
- yamllint rules documentation: https://yamllint.readthedocs.io/en/stable/rules.html
- yq installation and usage documentation: https://pkg.go.dev/github.com/mikefarah/yq/v4
- Flux HelmRelease CRD source: https://github.com/fluxcd/helm-controller/blob/main/config/crd/bases/helm.toolkit.fluxcd.io_helmreleases.yaml
- Flux community JSON schemas for kubeconform/YAML tooling: https://github.com/fluxcd-community/flux2-schemas

## Issues Found
- The prerequisite list used `yq` in multiple scripts but did not install it. Added the official `go install github.com/mikefarah/yq/v4@latest` command and added a matching CI install step.
- The kubeconform Flux CRD schema URL pointed at a non-existent JSON schema path under `fluxcd/flux2`. Replaced it with a working kubeconform schema template backed by the Flux community schema repository.
- The Helm rendering examples used `helm template --validate` as if it were fully local. Helm documents `--validate` as validation against the current Kubernetes cluster API server, so the local rendering examples now omit it and the cluster-backed validation case is called out separately.
- The value extraction script rendered only `$CHART`, which fails for charts from a Helm repository alias. Updated it to render `$REPO_NAME/$CHART` and to omit `--version` when the Flux HelmRelease does not specify a chart version.
- The `valuesFrom` validation script streamed multi-line YAML list items through `while read`, so `.kind` and `.name` were not read from complete objects. Updated it to emit one JSON object per referenced value source before parsing fields.
- The GitHub Actions rendering example extracted `REPO_NAME` but did not use the corresponding HelmRepository URL. Updated it to discover a matching `HelmRepository` manifest and use Helm's `--repo` flag when possible, falling back to the local repo alias.
- The local validation script treated `spec.chart.spec.version` as required, but Flux HelmRelease v2 marks it optional. Updated the script to require only chart and sourceRef name, while warning when the version is not pinned.
- The local validation script called kubeconform without the Flux HelmRelease schema location, so Flux CRDs would commonly be skipped or reported as unavailable. Added the same Flux HelmRelease schema location used earlier in the post.
- Added `xargs -r` in places where an empty input list could otherwise invoke the following command with no file arguments.

## Review Notes
The post is now technically valid for `helm.toolkit.fluxcd.io/v2` HelmRelease examples. The kubeconform schema template can also resolve other Flux schemas present in the same schema repository when the resource filename follows kubeconform's `ResourceKind` and `KindSuffix` naming.
