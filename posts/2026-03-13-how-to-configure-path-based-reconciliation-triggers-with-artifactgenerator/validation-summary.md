# Validation Summary: How to Configure Path-Based Reconciliation Triggers with ArtifactGenerator

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Flux
- Flux source-watcher
- ArtifactGenerator
- ExternalArtifact
- Flux Kustomization
- Kubernetes
- kubectl

## Sources Consulted
- Flux ArtifactGenerator documentation: https://fluxcd.io/flux/components/source/artifactgenerators/
- Flux ExternalArtifact documentation: https://fluxcd.io/flux/components/source/externalartifacts/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux v2.8 release notes and supported Kubernetes versions: https://fluxcd.io/blog/2026/02/flux-v2.8.0/
- Flux v2.7 ArtifactGenerator/source-watcher announcement: https://fluxcd.io/blog/2025/09/flux-v2.7.0/
- Flux source-watcher ArtifactGenerator API reference: https://pkg.go.dev/github.com/fluxcd/source-watcher/api/v2/v1beta1

## Issues Found
- The prerequisites listed Kubernetes v1.28 or later for Flux 2.8. Flux v2.8 officially supports Kubernetes v1.33-v1.35, so the prerequisite was updated.
- The prerequisites omitted the source-watcher component required for ArtifactGenerator. Added that Flux 2.8 should be installed with `source-watcher` enabled.
- The ArtifactGenerator examples used unsupported `artifacts[].path` fields and omitted required source aliases. Updated all examples to use `sources[].alias`, `artifacts[].name`, `originRevision`, and `copy` operations with `from`, `to`, and optional `exclude`.
- The post described downstream Kustomizations and HelmReleases as referencing the ArtifactGenerator directly. ArtifactGenerator produces ExternalArtifact resources, which downstream resources consume. Updated the explanation and Kustomization example to reference `ExternalArtifact`.
- The post described include/exclude behavior as direct path trigger matching against changed files. Updated the wording to reflect the documented behavior: ArtifactGenerator rebuilds generated ExternalArtifacts from copy operations, and downstream reconciliation is driven by changes to the generated ExternalArtifact revision.
- The verification section checked only ArtifactGenerators and referred to the ArtifactGenerator's last artifact revision. Added an ExternalArtifact status check and clarified that the generated ExternalArtifact revision is what should change.
- The event command used a lower-case resource kind. Updated it to `kubectl events --for ArtifactGenerator/api-service -n flux-system`, matching the documented Flux event examples.
- The glob reference described ArtifactGenerator paths. Updated it to refer to `from` and `exclude` fields, which are the documented fields that accept glob patterns.

## Review Notes
ArtifactGenerator is available through Flux's source-watcher component and currently uses the beta `source.extensions.fluxcd.io/v1beta1` API. ExternalArtifact support in kustomize-controller depends on the controller's ExternalArtifact feature gate being enabled in current Flux documentation.
