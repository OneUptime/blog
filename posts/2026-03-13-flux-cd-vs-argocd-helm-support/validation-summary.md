# Validation Summary: Flux CD vs ArgoCD: Which Handles Helm Better

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Flux CD
- Argo CD
- Helm
- Kubernetes
- GitOps
- OCI artifacts and Helm charts

## Sources Consulted
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Helm API reference v2: https://fluxcd.io/flux/components/helm/api/v2/
- Flux OCIRepository documentation: https://fluxcd.io/flux/components/source/ocirepositories/
- Flux `flux reconcile helmrelease` CLI reference: https://fluxcd.io/flux/cmd/flux_reconcile_helmrelease/
- Argo CD Helm documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/helm/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD multiple sources documentation: https://argo-cd.readthedocs.io/en/release-3.1/user-guide/multiple_sources/
- Argo CD OCI documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/oci/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/stable/user-guide/application-specification/

## Issues Found
- The Flux drift detection section said drift is corrected on the next interval unless `force: true` is set for immediate reconciliation. Flux Helm drift correction requires `spec.driftDetection.mode: enabled`; `force` is not the ongoing drift-detection switch. Updated the section to describe drift detection mode and `flux reconcile helmrelease` for out-of-interval reconciliation.
- The Argo CD upgrade remediation section implied Argo CD relies on Helm native upgrade mechanics. Argo CD uses Helm only to render templates and manages lifecycle through Argo CD sync. Updated the wording to distinguish Argo CD sync retries from Flux HelmRelease remediation.
- The OCI section claimed Flux OCIRepository has "full image policy" support. OCIRepository supports semver selection, digest pinning, and artifact polling, while Flux image policies are a separate image automation API. Updated the claim and edge summary.
- The Argo CD multi-source example did not actually wire a Helm chart to value files from the second repository. Updated the example to use `helm.valueFiles` with a `$values/...` reference and `ref: values`, matching Argo CD's documented pattern.

## Review Notes
The remaining examples use current Flux `helm.toolkit.fluxcd.io/v2` and Argo CD `argoproj.io/v1alpha1` APIs. The Flux HelmRelease example assumes the referenced `HelmRepository` exists in `flux-system`, which is normal for a focused comparison snippet.
