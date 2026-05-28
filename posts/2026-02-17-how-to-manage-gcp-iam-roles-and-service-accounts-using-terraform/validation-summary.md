# Validation Summary: How to Manage GCP IAM Roles and Service Accounts Using Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud IAM
- Google Cloud service accounts
- Terraform
- HashiCorp Google Terraform provider
- GKE Workload Identity Federation
- Kubernetes service accounts
- Cloud Storage, Pub/Sub, and Secret Manager resource-level IAM

## Sources Consulted
- HashiCorp Google provider documentation: Project IAM resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam
- HashiCorp Google provider documentation: Service accounts: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account
- HashiCorp Google provider documentation: Service account IAM resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account_iam
- HashiCorp Google provider documentation: Project custom roles: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam_custom_role
- HashiCorp Google provider documentation: Cloud Storage bucket IAM: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket_iam
- HashiCorp Google provider documentation: Pub/Sub topic IAM: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic_iam
- HashiCorp Google provider documentation: Secret Manager secret IAM: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_iam
- HashiCorp Kubernetes provider documentation: Kubernetes ServiceAccount v1: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/service_account_v1
- Google Cloud documentation: IAM Conditions attribute reference: https://cloud.google.com/iam/docs/conditions-attribute-reference
- Google Cloud documentation: Authenticate to Google Cloud APIs from GKE workloads: https://cloud.google.com/kubernetes-engine/docs/how-to/workload-identity
- Google Cloud documentation: Service account credentials: https://cloud.google.com/iam/docs/service-account-creds
- Google Cloud documentation: IAM audit logging: https://cloud.google.com/iam/docs/audit-logging

## Issues Found
- The introduction said Console-managed IAM has "zero audit trail." Google Cloud records IAM administrative changes in Cloud Audit Logs, so this was changed to "no version-controlled audit trail."
- The GKE Workload Identity example granted `roles/iam.workloadIdentityUser` to the Kubernetes service account but omitted the Kubernetes service account annotation required for IAM service account impersonation. Added a `kubernetes_service_account_v1` example with the `iam.gke.io/gcp-service-account` annotation.
- The business-hours IAM condition used `<= 17`, which grants access during the entire 5 PM hour. Changed it to `< 17` so access runs from 9:00 through 16:59 in the specified time zone.

## Review Notes
- Terraform CLI was not installed in the review environment, so HCL snippets were reviewed manually against official provider documentation rather than validated with `terraform validate`.
- The post uses IAM service account impersonation for GKE Workload Identity Federation. Google Cloud currently recommends direct IAM principal identifiers for GKE workloads when supported by the target API, with impersonation as the documented alternative for APIs or use cases that need it.
