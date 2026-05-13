# Validation Summary: How to Migrate from GitRepository to ArtifactGenerator in Flux

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Flux CD
- Flux source-controller and source-watcher
- ArtifactGenerator
- ExternalArtifact
- GitRepository
- Kustomization
- HelmRelease
- Kubernetes custom resources
- kubectl and Flux CLI

## Sources Consulted
- Flux ArtifactGenerator documentation: https://fluxcd.io/flux/components/source/artifactgenerators/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux 2.7 release announcement: https://fluxcd.io/blog/2025/09/flux-v2.7.0/
- Flux CLI documentation for ArtifactGenerator status: https://fluxcd.io/flux/cmd/flux_get_artifacts_generators/

## Issues Found
- The post incorrectly stated that Kustomizations and HelmReleases should reference an `ArtifactGenerator` directly. Flux ArtifactGenerators generate `ExternalArtifact` resources; Kustomizations and HelmReleases should reference those generated `ExternalArtifact` objects. Updated the migration examples and explanatory text accordingly.
- The ArtifactGenerator examples used an invalid simplified `artifacts[].path` shape and omitted required fields. Updated the examples to include source `alias`, artifact `name`, `originRevision`, and `copy` operations using the documented `@alias/...` to `@artifact/...` syntax.
- The post said ArtifactGenerator was a Flux 2.8 feature. Flux 2.7 introduced the source-watcher component and ArtifactGenerator API, while current Flux 2.8 documentation also covers it. Updated the prerequisite to Flux 2.7 or later.
- The prerequisites did not mention required operational setup for this workflow. Added that source-watcher must be installed and that the ExternalArtifact feature gate must be enabled for controllers that consume ExternalArtifacts.
- Verification steps checked ArtifactGenerators but not the generated ExternalArtifacts. Added a `kubectl get externalartifacts -n flux-system` check.

## Review Notes
The corrected examples preserve source paths inside generated artifacts so the existing Kustomization `path` values can remain unchanged. The HelmRelease example copies the chart contents to the root of the generated ExternalArtifact because `chartRef` expects the referenced artifact to contain the Helm chart.
