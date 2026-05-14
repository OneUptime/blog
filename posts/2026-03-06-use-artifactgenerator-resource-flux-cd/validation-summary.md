# Validation Summary: How to Use ArtifactGenerator Resource in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Flux source-watcher
- ArtifactGenerator
- ExternalArtifact
- GitRepository
- OCIRepository
- HelmRelease
- Kustomization
- Kubernetes custom resources
- Flux notification Alert and Provider resources

## Sources Consulted
- Flux Artifact Generators documentation: https://fluxcd.io/flux/components/source/artifactgenerators/
- Flux Source Controllers documentation: https://fluxcd.io/flux/components/source/
- Flux optional components documentation: https://fluxcd.io/flux/installation/configuration/optional-components/
- Flux install command documentation: https://fluxcd.io/flux/cmd/flux_install/
- Flux CLI command reference: https://fluxcd.io/flux/cmd/flux/
- Flux `flux get artifacts generators` command documentation: https://fluxcd.io/flux/cmd/flux_get_artifacts_generators/
- Flux `flux tree artifact generator` command documentation: https://fluxcd.io/flux/cmd/flux_tree_artifact_generator/
- Flux External Artifacts documentation: https://fluxcd.io/flux/components/source/externalartifacts/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomization documentation: https://fluxcd.io/flux/components/kustomize/kustomizations/
- Flux Alerts documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux v2.8 announcement: https://fluxcd.io/blog/2026/02/flux-v2.8.0/

## Issues Found
- The post used the wrong API group and version for ArtifactGenerator (`source.toolkit.fluxcd.io/v1`). Updated examples to `source.extensions.fluxcd.io/v1beta1`.
- The post described ArtifactGenerator as producing a source that Kustomization and HelmRelease consume directly. Updated the explanation and examples to show ArtifactGenerator producing ExternalArtifact resources.
- The post used unsupported `spec.inputs`, `sourceRef`, `path`, `transforms`, `output`, `priority`, `failurePolicy`, and `conflictResolution` fields. Replaced these with the supported `spec.sources`, `spec.artifacts`, and `copy` operations.
- The installation section referred to an `artifact-generator` controller and the wrong CRD name. Updated it to source-watcher and `artifactgenerators.source.extensions.fluxcd.io`.
- The HelmRelease example used `valuesFrom` with `kind: ArtifactGenerator`, which is not a supported values source. Updated it to consume a generated ExternalArtifact through `chartRef`.
- The Kustomization example referenced `kind: ArtifactGenerator` as a source. Updated it to reference the generated `ExternalArtifact`.
- The post omitted the controller feature-gate caveat for consuming ExternalArtifact resources from HelmRelease and Kustomization. Added this prerequisite and local notes near the examples.
- The monitoring and troubleshooting commands included an unsupported `flux reconcile source artifact-generator` command. Removed it and added supported Flux CLI commands for listing and inspecting ArtifactGenerator resources.
- The alert example used incomplete Slack provider configuration. Updated it to match the documented Slack Provider and Alert pattern.
- The best-practices section referred to an ArtifactGenerator interval field. Updated it to clarify that referenced source intervals drive source change detection.

## Review Notes
ArtifactGenerator is a newer Flux source-watcher API and is still documented as `v1beta1`. The corrected examples intentionally avoid unsupported transformation semantics and use file copy, exclude patterns, copy order, and the `Merge` copy strategy documented by Flux.
