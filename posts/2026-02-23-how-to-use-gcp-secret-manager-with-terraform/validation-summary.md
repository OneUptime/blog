# Validation Summary: How to Use GCP Secret Manager with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Google Cloud Secret Manager
- Google Cloud IAM
- Cloud Run
- Google Kubernetes Engine
- Cloud Functions
- Pub/Sub
- Cloud Audit Logs
- Google Cloud CLI

## Sources Consulted
- HashiCorp Terraform Google provider: `google_secret_manager_secret`, `google_secret_manager_secret_version`, and Secret Manager data sources: https://registry.terraform.io/providers/hashicorp/google/latest/docs
- HashiCorp Terraform Google provider: `google_cloud_run_v2_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
- HashiCorp Terraform Google provider: `google_container_cluster`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/container_cluster
- Google Cloud Secret Manager add-on for GKE: https://docs.cloud.google.com/secret-manager/docs/secret-manager-managed-csi-component
- Google Cloud Run secrets configuration: https://docs.cloud.google.com/run/docs/configuring/services/secrets
- Google Cloud Secret Manager audit logging: https://docs.cloud.google.com/secret-manager/docs/audit-logging
- Google Cloud SDK `gcloud logging read` reference: https://cloud.google.com/sdk/gcloud/reference/logging/read
- Google Cloud Secret Manager IAM roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/secretmanager

## Issues Found
- The post did not mention that `google_secret_manager_secret_version.secret_data` is stored in Terraform state. Added a note to protect state and consider write-only secret version arguments where supported.
- The IAM example labeled an authoritative `google_secret_manager_secret_iam_binding` as conditional access and showed it alongside an `iam_member` for the same secret and role. Clarified that it is an alternative authoritative binding and should be used instead of another member resource for that same role.
- The GKE Secret Manager add-on example granted access to the node service account. Current Google Cloud guidance has pods authenticate with Workload Identity Federation for GKE and grants Secret Manager access to the Kubernetes ServiceAccount principal. Updated the snippet to enable Workload Identity and bind `roles/secretmanager.secretAccessor` to the Kubernetes ServiceAccount principal.
- The conclusion implied Terraform never exposes secret values. Updated it to distinguish application configuration from Terraform state handling.

## Review Notes
- The Cloud Run example is syntactically consistent with the current `google_cloud_run_v2_service` schema. Google recommends pinning secret environment variables to a specific version instead of `latest`; the example still works, but pinning is safer for production.
- The rotation example correctly uses Secret Manager rotation notifications with Pub/Sub and a Cloud Functions v2 Pub/Sub trigger, but the rotation function implementation and required service account permissions are intentionally outside the snippet.
