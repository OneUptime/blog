# Validation Summary: How to Use ArtifactGenerator for Helm Chart Extraction in Flux 2.8

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux 2.8
- Flux ArtifactGenerator
- Flux ExternalArtifact
- Flux HelmRelease
- Flux GitRepository
- Helm charts
- Kubernetes
- GitOps

## Sources Consulted
- Flux ArtifactGenerator documentation - https://fluxcd.io/flux/components/source/artifactgenerators/
- Flux source controller and source-watcher documentation - https://fluxcd.io/flux/components/source/
- Flux HelmRelease documentation - https://fluxcd.io/flux/components/helm/helmreleases/
- Flux HelmRelease guide - https://fluxcd.io/flux/guides/helmreleases/
- Flux 2.8 GA announcement and supported versions - https://fluxcd.io/blog/2026/02/flux-v2.8.0/
- Flux Operator Web UI documentation - https://fluxoperator.dev/web-ui/
- Flux Operator Web UI actions documentation - https://fluxoperator.dev/docs/web-ui/user-actions/

## Issues Found
- The ArtifactGenerator examples used unsupported `artifacts[].path` fields and omitted required source aliases. Updated them to use `sources[].alias`, `artifacts[].name`, `originRevision`, and `copy` operations with `from`, `to`, and `exclude` fields.
- The HelmRelease examples referenced `ArtifactGenerator` directly through `spec.chartRef`. Updated them to reference the generated `ExternalArtifact` resources, which is the supported source type for ArtifactGenerator output.
- The prerequisites listed Kubernetes v1.28 or later. Updated the prerequisite to Flux 2.8's documented supported Kubernetes versions: 1.33, 1.34, and 1.35.
- Added the `ExternalArtifact` feature gate prerequisite because HelmRelease `chartRef` support for ExternalArtifact is documented as feature-gated.
- The Web UI section described a generic "Flux 2.8 Web UI" and claimed ArtifactGenerators appear under their own tab. Updated it to refer to the Flux Operator Web UI and to describe supported ArtifactGenerator/ExternalArtifact inspection and download behavior more accurately.
- The status output used a non-documented status phrase. Adjusted it to avoid implying a precise controller message that is not guaranteed.

## Review Notes
ArtifactGenerator is a beta API (`source.extensions.fluxcd.io/v1beta1`) in Flux 2.8. The corrected examples assume the chart directory is copied to the root of the generated ExternalArtifact so Helm can treat that artifact as the chart.
