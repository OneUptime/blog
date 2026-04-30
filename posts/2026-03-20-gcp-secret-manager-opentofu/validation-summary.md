# Validation Summary: How to Use GCP Secret Manager with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- Google Cloud Secret Manager
- Google Cloud IAM
- Google Cloud Pub/Sub
- Google Cloud SQL
- Terraform Google provider
- HCL

## Sources Consulted
- OpenTofu data sources documentation: https://opentofu.org/docs/v1.8/language/data-sources/
- Terraform Google provider `google_secret_manager_secret_version`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/secret_manager_secret_version
- Terraform Google provider `google_secret_manager_secret_version_access`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/secret_manager_secret_version_access
- Terraform Google provider `google_secret_manager_secret`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret
- Terraform Google provider `google_secret_manager_secret_version`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_version
- Terraform Google provider `google_secret_manager_secret_iam_*`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_iam
- Terraform Google provider `google_project_service`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_service
- Terraform Google provider `google_pubsub_topic_iam_*`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic_iam
- Terraform Google provider `google_sql_database_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Terraform Google provider `google_sql_user`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_user
- Google Cloud Secret Manager access control: https://cloud.google.com/secret-manager/docs/access-control
- Google Cloud Secret Manager access secret version: https://cloud.google.com/secret-manager/docs/access-secret-version
- Google Cloud Secret Manager rotation schedules: https://cloud.google.com/secret-manager/docs/secret-rotation
- Google Cloud Secret Manager REST reference for `projects.secrets`: https://cloud.google.com/secret-manager/docs/reference/rest/v1/projects.secrets
- Google Cloud SQL private IP configuration: https://cloud.google.com/sql/docs/postgres/configure-private-ip
- GKE Workload Identity Federation for GKE: https://cloud.google.com/kubernetes-engine/docs/concepts/workload-identity

## Issues Found
- The post said OpenTofu reads the secret data source "at apply time" and used `google_secret_manager_secret_version`. I changed this to `google_secret_manager_secret_version_access` and updated the wording because OpenTofu reads data sources during planning when possible and defers to apply only when needed, and the `..._access` data source matches `roles/secretmanager.secretAccessor`.
- The provider version pin `~> 5.0` was outdated relative to the current provider documentation reviewed on April 30, 2026. I updated it to `~> 7.0`.
- The Cloud SQL example set `ipv4_enabled = false` without configuring `private_network`. I removed that block because the provider requires either public IPv4 enabled or a configured private network.
- The IAM example comment referred to "GKE workload identity", but the `member` value was a Google IAM service account. I corrected the comment to match the actual principal type.
- The rotation section referred to "Lambda", which is an AWS service, and omitted required setup for Pub/Sub delivery. I changed the wording to a GCP-appropriate rotation workflow, enabled the Pub/Sub API, granted the Secret Manager service agent `roles/pubsub.publisher` on the topic, and added dependencies so the APIs and IAM are in place before the secret configuration relies on them.

## Review Notes
- The examples keep secrets out of HCL source files, but the Google provider docs note that `google_secret_manager_secret_version.secret_data` and `google_sql_user.password` are stored in raw state as plain text. Teams should treat the OpenTofu or Terraform state backend as sensitive.
- The `db-g1-small` machine type is valid, but Google Cloud documents it as a shared-core tier intended for low-cost dev and test usage rather than production workloads.
