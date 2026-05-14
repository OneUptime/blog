# Validation Summary: How to Configure HelmRepository with OCI Protocol in Flux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux CD
- Kubernetes
- Helm
- HelmRepository
- HelmRelease
- OCI registries
- GitHub Container Registry
- Docker Hub
- AWS ECR
- Azure ACR
- Google Artifact Registry

## Sources Consulted
- Flux HelmRepository documentation: https://fluxcd.io/flux/components/source/helmrepositories/
- Flux source-controller API reference v1: https://fluxcd.io/flux/components/source/api/v1/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/
- Helm OCI registry documentation: https://helm.sh/docs/v3/topics/registries/
- Docker Hub OCI artifacts documentation: https://docs.docker.com/docker-hub/repos/manage/hub-images/oci-artifacts/

## Issues Found
- The post did not mention that Flux currently documents `HelmRepository` with `spec.type: oci` as maintenance mode. Added a short note in the introduction and summary recommending that readers also evaluate the `OCIRepository` API for new OCI chart workflows.
- The examples included `interval: 30m` without explaining that Flux accepts but ignores `.spec.interval` for OCI HelmRepository resources. Added comments to the OCI examples so readers do not expect repository polling behavior for OCI sources.
- The verification section said only that no stored artifact is shown for OCI repositories. Clarified that the existence of the OCI HelmRepository object means it is ready for use, matching the Flux documentation.

## Review Notes
The YAML snippets use current Flux `source.toolkit.fluxcd.io/v1` and `helm.toolkit.fluxcd.io/v2` APIs. The basic-auth secret examples use the documented `username` and `password` keys, and Docker config JSON secrets are also supported for OCI Helm repositories. Provider values `aws`, `azure`, and `gcp` are valid for OCI HelmRepository authentication, but each cloud provider setup still requires the corresponding workload identity, node identity, or service account configuration outside the shown resource.
