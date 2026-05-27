# Validation Summary: How to Use Terraform to Create and Manage Artifact Registry Repositories on GCP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Artifact Registry
- Google Container Registry
- Terraform Google provider
- Google Cloud IAM
- Docker
- Google Cloud CLI
- Artifact Analysis / Container Scanning

## Sources Consulted
- Google Cloud Artifact Registry: Transition from Container Registry: https://docs.cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Google Cloud Artifact Registry: Supported formats: https://docs.cloud.google.com/artifact-registry/docs/supported-formats
- Google Cloud Artifact Registry: Docker authentication: https://docs.cloud.google.com/artifact-registry/docs/docker/authentication
- Google Cloud Artifact Registry: Create remote repositories: https://docs.cloud.google.com/artifact-registry/docs/repositories/remote-repo
- Google Cloud Artifact Registry: Create virtual repositories: https://docs.cloud.google.com/artifact-registry/docs/repositories/virtual-repo
- Google Cloud Artifact Analysis: Container scanning overview: https://docs.cloud.google.com/artifact-analysis/docs/container-scanning-overview
- Google Cloud Artifact Analysis: Enable or disable automatic scanning: https://cloud.google.com/artifact-analysis/docs/enable-automatic-scanning
- HashiCorp Terraform Google provider: google_artifact_registry_repository: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository
- Google Cloud Artifact Registry: Access control with IAM: https://docs.cloud.google.com/artifact-registry/docs/access-control

## Issues Found
- The vulnerability scanning Terraform snippet enabled `containerscanning.googleapis.com` but described it as the Container Analysis API and named the resource `containeranalysis`. Google documents automatic Artifact Registry vulnerability scanning as enabled through the Container Scanning API; enabling it also enables the Container Analysis API for metadata. Updated the comment and Terraform resource name to `container_scanning`.
- The virtual repository example used lower priority for the internal repository while saying it would be checked first. Google documents that the highest priority value is searched first. Swapped the priority values so the internal repository has priority `20` and the proxy has priority `10`.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The HCL resource names and fields were checked against the current official Terraform provider and Google Cloud documentation instead.
