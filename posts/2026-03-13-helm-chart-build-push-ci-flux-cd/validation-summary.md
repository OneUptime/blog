# Validation Summary: How to Configure Helm Chart Build and Push in CI for Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD source-controller and helm-controller
- Flux OCIRepository and HelmRelease resources
- Helm 3 OCI chart packaging and push workflows
- GitHub Actions CI
- ChartMuseum HTTP chart repositories
- Kubernetes kubectl dry-run validation

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease guide: https://fluxcd.io/flux/guides/helmreleases/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux CLI documentation for `flux get sources oci`: https://fluxcd.io/flux/cmd/flux_get_sources_oci/
- Helm OCI registry documentation: https://helm.sh/docs/v3/topics/registries/
- Helm `helm push` command documentation: https://helm.sh/docs/v3/helm/helm_push/
- Helm chart metadata documentation: https://helm.sh/docs/topics/charts/
- Kubernetes `kubectl apply` documentation: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- ChartMuseum API documentation: https://chartmuseum.com/docs/

## Issues Found

1. **The OCIRepository example did not select the Helm chart OCI layer.** Flux documentation recommends selecting the Helm chart content layer with `spec.layerSelector.mediaType: application/vnd.cncf.helm.chart.content.v1.tar+gzip` and `operation: copy` when using an OCIRepository as a Helm chart source. Added the layer selector to the OCIRepository manifest.

2. **The HelmRelease example referenced an OCIRepository through `spec.chart.spec.sourceRef`.** Current Flux HelmRelease documentation uses `spec.chartRef` for direct OCIRepository references; the chart template `sourceRef` form is for HelmRepository, GitRepository, or Bucket sources. Replaced the chart template block with `spec.chartRef`.

3. **The prerequisites omitted kubectl even though the CI example uses it.** Added `kubectl` to the CI tooling prerequisite because the workflow runs `kubectl apply --dry-run=client`.

4. **The OCI provenance wording was overstated.** OCI registries provide registry infrastructure and authentication, while signing and provenance are implemented through Helm provenance files and ecosystem tools such as Cosign. Updated the wording to say OCI integrates with signing and provenance workflows rather than guaranteeing provenance by itself.

## Review Notes
- The ChartMuseum upload example uses the documented `POST /api/charts` endpoint and is technically valid for a simple ChartMuseum deployment.
- The `helm push` destination correctly omits the chart basename and tag; Helm infers those from the packaged chart name and semantic version.
- The Flux CLI verification command for OCIRepository sources is valid, though the official docs mark `flux get sources oci` as preview.
