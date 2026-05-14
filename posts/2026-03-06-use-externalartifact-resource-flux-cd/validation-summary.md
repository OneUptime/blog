# Validation Summary: How to Use ExternalArtifact Resource in Flux CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- ExternalArtifact
- ArtifactGenerator
- Kubernetes Kustomization
- HelmRelease
- Kubernetes RBAC
- Kubernetes kubectl
- Flux Notification Alert

## Sources Consulted
- Flux ExternalArtifact documentation: https://fluxcd.io/flux/components/source/externalartifacts/
- Flux ArtifactGenerator documentation: https://fluxcd.io/flux/components/source/artifactgenerators/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Flux Kustomize API reference: https://fluxcd.io/flux/components/kustomize/api/v1/
- Flux 2.7 release announcement: https://fluxcd.io/blog/2025/09/flux-v2.7.0/

## Issues Found
- The post stated that Flux CD v2.5+ was sufficient for ExternalArtifact support. Updated the prerequisite to Flux CD v2.7+, matching the Flux 2.7 release announcement for the ExternalArtifact and ArtifactGenerator APIs.
- The introduction implied HelmRelease support for ExternalArtifact was unconditional. Updated the text to note that HelmRelease `chartRef` support for ExternalArtifact requires the helm-controller `ExternalArtifact` feature gate.
- The ExternalArtifact status example omitted the required Ready condition used later by the monitoring command. Added a standard `Ready=True` condition with `reason: Succeeded`.
- The ArtifactGenerator example used the wrong API group and an unsupported `spec.sourceRef` / `spec.path` shape. Updated it to `source.extensions.fluxcd.io/v1beta1` with `spec.sources`, `spec.artifacts`, `originRevision`, and `copy` operations.
- The manual status patch example pointed at source-controller storage without uploading anything there and omitted conditions. Updated it to use an external controller URL variable and set the Ready condition along with `.status.artifact`.
- The alert example used `eventSeverity: error` while the summary said it detected updates or failures. Updated the summary to describe error events only.
- The ArtifactGenerator best practice omitted the source-watcher dependency. Added the source-watcher requirement.

## Review Notes
ExternalArtifact status is intended to be managed by a controller or process that also makes the referenced artifact URL reachable. The kubectl patch remains a simulation of the status update only; a real implementation must upload the artifact before setting the Ready condition.
