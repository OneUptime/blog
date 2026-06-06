# Validation Summary: How to Use Remote State Backends in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (core, state, backends, CLI)
- AWS S3 + DynamoDB (state storage and locking)
- Azure Blob Storage (state storage with blob lease locking)
- Google Cloud Storage (state storage and locking)
- HCP Terraform / Terraform Cloud (managed backend)
- AWS IAM (least-privilege policy for state access)
- AWS KMS (state encryption at rest)
- HCL configuration language
- Mermaid (diagrams)

## Sources Consulted
- Backend Type: s3 — https://developer.hashicorp.com/terraform/language/backend/s3
- Backend Type: azurerm — https://developer.hashicorp.com/terraform/language/backend/azurerm
- Backend Type: gcs — https://developer.hashicorp.com/terraform/language/backend/gcs
- Backend Type: cloud — https://developer.hashicorp.com/terraform/cli/cloud/settings
- terraform_remote_state data source — https://developer.hashicorp.com/terraform/language/state/remote-state-data
- azurerm_storage_account resource — https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/storage_account
- AzureRM provider version history 3.0.0–3.116.0 — https://learn.microsoft.com/en-us/azure/developer/terraform/provider-version-history-azurerm-3-0-0-to-3-116-0
- aws_s3_bucket_server_side_encryption_configuration — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- google_storage_bucket lifecycle_rule — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- HashiCorp Support: Migrate Terraform State Between Backends — https://support.hashicorp.com/hc/en-us/articles/44027197997587
- Terraform 1.10 / 1.11 release notes (S3 native locking GA)

## Issues Found

1. **Deprecated azurerm argument `enable_https_traffic_only`** — In the `azurerm_storage_account.terraform_state` resource, the argument `enable_https_traffic_only = true` was used. This argument was deprecated in azurerm provider 3.114.0 (Aug 2024) in favor of `https_traffic_only_enabled`, and was removed entirely in azurerm 4.x. Because the post pins `~> 3.0` (which resolves to recent 3.x releases), the old name still works but emits deprecation warnings and will break on a future major upgrade. Replaced with `https_traffic_only_enabled = true`, which is valid in both 3.114+ and 4.x.

## Review Notes

- **S3 native state locking (`use_lockfile`)**: All AWS S3 backend examples in the post still use DynamoDB-based locking via the `dynamodb_table` argument. Terraform 1.10 (Nov 2024) introduced S3 native locking via `use_lockfile = true` as experimental, and Terraform 1.11 (Feb 2025) promoted it to GA and **deprecated** `dynamodb_table`, `dynamodb_endpoint`, and `endpoints.dynamodb`. The DynamoDB approach still works and the code shown is functionally correct, but the modern recommendation for new deployments is `use_lockfile = true` (no DynamoDB table required). Not fixed because the code is not strictly incorrect — but a future revision should highlight S3 native locking as the preferred path.
- **HCP Terraform rebrand**: HashiCorp rebranded Terraform Cloud to "HCP Terraform" in April 2024. The `cloud` block syntax and `terraform login` command are unchanged and remain correct. The post still refers to it as "Terraform Cloud," which is acceptable but slightly dated terminology.
- **`aws_s3_bucket_server_side_encryption_configuration`**: Technically correct. For cost optimization with `aws:kms`, consider adding `bucket_key_enabled = true` to reduce KMS request charges, but this is an optimization rather than a correctness issue.
- **Example AMI ID `ami-0c55b159cbfafe1f0`**: A commonly used example AMI that may not exist or be current in any AWS region. Acceptable as illustrative example code.
- **Terminology in the lock-info bash example**: The line `terraform plan` under the `# View lock information` comment is slightly misleading — `terraform plan` only surfaces lock info when a lock is already held by another process. Not an error, just a minor framing nit.
- **Backend block cannot use variables**: The post correctly notes this limitation in a comment, which is accurate.
