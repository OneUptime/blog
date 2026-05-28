# Validation Summary: How to Configure IAM Permissions for Artifact Registry Repositories

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Artifact Registry
- Google Cloud IAM
- Google Cloud CLI
- Cloud Build
- Google Kubernetes Engine
- Terraform Google provider

## Sources Consulted
- Google Cloud Artifact Registry access control with IAM: https://docs.cloud.google.com/artifact-registry/docs/access-control
- Google Cloud Artifact Registry roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/artifactregistry
- Google Cloud SDK reference for `gcloud artifacts repositories add-iam-policy-binding`: https://docs.cloud.google.com/sdk/gcloud/reference/artifacts/repositories/add-iam-policy-binding
- Google Cloud SDK reference for `gcloud builds get-default-service-account`: https://docs.cloud.google.com/sdk/gcloud/reference/builds/get-default-service-account
- Google Cloud Build default service account documentation: https://cloud.google.com/build/docs/cloud-build-service-account
- Google Cloud Build Artifact Registry storage documentation: https://cloud.google.com/build/docs/building/store-artifacts-in-artifact-registry
- Google Cloud Artifact Registry GKE integration documentation: https://docs.cloud.google.com/artifact-registry/docs/integrate-gke
- Google Cloud GKE Workload Identity Federation concepts: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity
- Terraform Google provider `google_artifact_registry_repository`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository
- Terraform Google provider `google_artifact_registry_repository_iam`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository_iam

## Issues Found
- The Cloud Build example assumed the legacy Cloud Build service account format, `${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com`. Google Cloud documentation now states that the default Cloud Build service account can be either the Compute Engine default service account or the legacy Cloud Build service account depending on project and organization settings. I changed the example to use `gcloud builds get-default-service-account --project=my-project`, then grant `roles/artifactregistry.writer` to the returned account.
- The GKE Workload Identity section said to grant Artifact Registry reader access to the Kubernetes service account's mapped Google service account for image pulls. GKE documentation states that image pulls still use the node pool IAM service account even when Workload Identity Federation for GKE is enabled. I changed the paragraph and command to grant reader access to the node service account.

## Review Notes
The remaining Artifact Registry IAM roles, repository-level `gcloud artifacts repositories` IAM commands, cross-project service account examples, and Terraform IAM resource fields match the official Google Cloud and Terraform provider documentation. The custom role example uses a valid Artifact Registry permission, but predefined roles should remain the default recommendation for most readers because Google documents `roles/artifactregistry.reader` as the supported role for pulling images.
