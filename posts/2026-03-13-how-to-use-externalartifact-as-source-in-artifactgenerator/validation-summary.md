# Validation Summary: How to Use ExternalArtifact as Source in ArtifactGenerator

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux CD
- Flux ExternalArtifact
- Flux ArtifactGenerator
- Flux Kustomization
- Flux HelmRelease
- Kubernetes
- GitHub Actions
- kubectl
- Kustomize

## Sources Consulted
- Flux ArtifactGenerator documentation - https://fluxcd.io/flux/components/source/artifactgenerators/
- Flux ExternalArtifact documentation - https://fluxcd.io/flux/components/source/externalartifacts/
- Flux Source API reference v1 - https://fluxcd.io/flux/components/source/api/v1/
- Flux Kustomization documentation - https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux HelmRelease documentation - https://fluxcd.io/flux/components/helm/helmreleases/
- Flux 2.8 GA announcement - https://fluxcd.io/blog/2026/02/flux-v2.8.0/

## Issues Found
- The ExternalArtifact examples used `apiVersion: source.extensions.fluxcd.io/v1beta1` and placed artifact metadata under `spec.artifact`. Updated them to use `apiVersion: source.toolkit.fluxcd.io/v1` with artifact metadata under `status.artifact`, because the official ExternalArtifact API only has optional `spec.sourceRef` and reports artifact data in status.
- The ArtifactGenerator examples omitted required source aliases and used unsupported `artifacts[].path` fields. Updated them to use `sources[].alias`, `artifacts[].name`, `originRevision`, and `copy` operations with `from`, `to`, and `exclude` fields.
- The Kustomization examples referenced `ArtifactGenerator` directly as `sourceRef.kind`. Updated them to reference the generated `ExternalArtifact` resources, which is the supported downstream source type.
- The CI workflow attempted to POST directly to a source-controller ExternalArtifact endpoint and patched `spec.artifact`. Replaced this with a generic artifact upload step and a status subresource patch for `status.artifact`, matching the ExternalArtifact lifecycle model.
- The error handling section referred to artifact URL and digest fields in spec and to include paths. Updated those references to status fields and ArtifactGenerator copy paths.

## Review Notes
- The post is now aligned with Flux 2.8-era documentation. In real deployments, an external controller or trusted automation should manage ExternalArtifact status and ensure the artifact URL is reachable by Flux controllers.
