# Validation Summary: How to Create a Helm OCI Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Helm 3 OCI registry support
- OCI-compatible container registries
- Kubernetes Helm chart packaging and installation
- Amazon ECR
- Google Artifact Registry and gcr.io Artifact Registry repositories
- Azure Container Registry
- Docker Hub
- GitHub Container Registry
- Harbor
- Docker Distribution registry
- GitHub Actions and GitLab CI

## Sources Consulted
- Helm documentation: Use OCI-based registries - https://helm.sh/docs/topics/registries/
- Helm CLI documentation: helm registry login - https://helm.sh/docs/helm/helm_registry_login/
- Amazon ECR documentation: Pushing a Helm chart to an Amazon ECR private repository - https://docs.aws.amazon.com/AmazonECR/latest/userguide/push-oci-artifact.html
- Google Artifact Registry documentation: Manage Helm charts - https://docs.cloud.google.com/artifact-registry/docs/helm/manage-charts
- Google Artifact Registry documentation: Transition from Container Registry - https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Azure Container Registry documentation: Push and pull Helm charts to an Azure container registry - https://learn.microsoft.com/en-us/azure/container-registry/container-registry-helm-repos
- Docker documentation: Software artifacts on Docker Hub - https://docs.docker.com/docker-hub/repos/manage/hub-images/oci-artifacts/
- Harbor documentation: Working with OCI Helm Charts - https://goharbor.io/docs/main/working-with-projects/working-with-oci/working-with-helm-oci-charts/

## Issues Found
- The post stated that Helm stores credentials in the same location as Docker and showed `cat ~/.docker/config.json`. Current Helm documentation lists Helm's default registry config as `~/.config/helm/registry/config.json`, while allowing a shared config via `--registry-config`. Updated the text and command to show Helm's default file.
- The post included a "legacy GCR" push example. Google Container Registry is deprecated and, effective March 18, 2025, no longer accepts writes to Container Registry. Updated the section to say that `gcr.io` compatibility should use `gcr.io` repositories backed by Artifact Registry.

## Review Notes
- Helm OCI support became generally available in Helm 3.8.0, and the post's package, push, pull, show, install, upgrade, dependency, and digest-related guidance matches current Helm documentation.
- Provider-specific examples for ECR, Artifact Registry, ACR, Docker Hub, and Harbor match the documented OCI Helm chart workflows at a command-pattern level. Registry permissions, pre-created repositories, and exact authentication method still vary by organization and cloud account configuration.
