# Validation Summary: How to Replace AWS CloudFormation with Terraform for Google Cloud Infrastructure

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- AWS CloudFormation
- Terraform
- Google Cloud
- Google Cloud Storage
- Compute Engine
- Cloud SQL for PostgreSQL
- Secret Manager
- Cloud Build

## Sources Consulted
- HashiCorp Terraform GCS backend documentation: https://developer.hashicorp.com/terraform/language/settings/backends/gcs
- HashiCorp Terraform install documentation: https://developer.hashicorp.com/terraform/install
- Terraform Google provider releases: https://releases.hashicorp.com/terraform-provider-google/
- Terraform Google provider `google_compute_instance` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_instance
- Terraform Google provider `google_compute_subnetwork` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_subnetwork
- Terraform Google provider `google_compute_firewall` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Terraform Google provider `google_sql_database_instance` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Terraform Google provider Secret Manager data source documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/secret_manager_secret_version
- Google Cloud Deployment Manager deprecation documentation: https://docs.cloud.google.com/deployment-manager/docs/deprecations
- Google Cloud Infrastructure Manager overview: https://docs.cloud.google.com/infrastructure-manager/docs/overview
- Google Cloud Cloud SQL for PostgreSQL high availability documentation: https://docs.cloud.google.com/sql/docs/postgres/configure-ha
- Google Cloud Cloud Build approvals documentation: https://docs.cloud.google.com/build/docs/securing-builds/gate-builds-on-approval
- AWS CloudFormation drift detection documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html
- AWS CloudFormation resource import documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/resource-import-existing-stack.html

## Issues Found
- The introduction described Deployment Manager as Google Cloud's current native IaC option. Updated it to note that Deployment Manager support was discontinued on March 31, 2026, and that Google Cloud supports Terraform-based workflows through Infrastructure Manager.
- The backend comment implied CloudFormation state uses an S3 backend. CloudFormation state is service-managed, so the comment was simplified to describe GCS remote state storage.
- The Google provider constraint used `~> 5.0`, which is stale for a 2026 review. Updated it to `~> 7.0`.
- The Compute Engine example called `e2-medium` equivalent to `t3.medium`. Updated the wording to a rough sizing match because the machine families are not directly equivalent.
- The Cloud SQL PostgreSQL HA example set `availability_type = "REGIONAL"` without backup/PITR settings. Added a production-only `backup_configuration` block with backups and point-in-time recovery enabled.
- The Terraform import comment conflated Terraform import with CloudFormation drift detection. Updated it to separate import from drift detection via `terraform plan`.
- The Cloud Build example used Terraform image tag `1.7`, which is outdated. Updated it to `1.15.4`, the current Terraform version shown by HashiCorp install documentation during review.
- The Cloud Build YAML comment implied manual approval is an inline pipeline step. Updated it to say production approval should be configured on the Cloud Build trigger.

## Review Notes
The examples are illustrative and omit some production concerns, such as state bucket IAM hardening, bucket retention policies, Terraform state locking behavior, service account IAM role grants, and safer secret handling to avoid storing secret values in Terraform state.
