# Validation Summary: How to Replicate Secrets Across Multiple Regions in GCP Secret Manager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Secret Manager
- Google Cloud CLI (`gcloud`)
- Cloud KMS and customer-managed encryption keys (CMEK)
- Terraform Google provider
- Cloud Audit Logs / Cloud Logging
- Mermaid diagrams

## Sources Consulted
- Google Cloud Secret Manager replication policy documentation: https://docs.cloud.google.com/secret-manager/docs/choosing-replication
- Google Cloud Secret Manager locations documentation: https://docs.cloud.google.com/secret-manager/docs/locations
- Google Cloud Secret Manager CMEK documentation: https://docs.cloud.google.com/secret-manager/docs/cmek
- Google Cloud SDK `gcloud secrets create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/secrets/create
- Google Cloud Secret Manager consistency documentation: https://docs.cloud.google.com/secret-manager/docs/reference/consistency
- Google Cloud Secret Manager audit logging documentation: https://docs.cloud.google.com/secret-manager/docs/audit-logging
- Terraform Google provider `google_secret_manager_secret` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret

## Issues Found
- Replaced the invalid region shorthand `eu-west1` with the valid GCP region name `europe-west1`.
- Clarified the CMEK recommendation to refer to per-region CMEK. Secret Manager also supports CMEK with automatic replication using a global KMS key, so the original table was too broad.
- Added the required Secret Manager service identity creation step before granting the service account Cloud KMS permissions for CMEK.
- Reworded the performance section because Google documents that requests are routed to one of the configured replica locations, not necessarily always the nearest replica, and does not publish the specific latency numbers used in the original text.
- Corrected the consistency discussion. Secret Manager documents strong consistency when accessing a newly added secret version by version number, while `latest` and aliases are excluded from that guarantee.
- Corrected the Cloud Logging filter to use the fully qualified audit log method name `google.cloud.secretmanager.v1.SecretManagerService.AccessSecretVersion` and noted that Data Access audit logs must be enabled.

## Review Notes
The `gcloud` and Terraform replication examples match current documented syntax. The post still uses placeholder project IDs, project numbers, and resource names, so readers must substitute real values before running the commands.
