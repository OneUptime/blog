# Validation Summary: How to Enforce Infrastructure Security with HashiCorp Sentinel Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Sentinel
- Terraform Cloud / Terraform Enterprise
- Terraform `tfplan/v2` Sentinel import
- Google Cloud Platform
- Terraform Google provider resources for Compute Firewall, Cloud Storage, Cloud SQL, and IAM
- Terraform Enterprise / HCP Terraform provider `tfe_policy_set`

## Sources Consulted
- HashiCorp Sentinel `tfplan/v2` import documentation: https://developer.hashicorp.com/sentinel/docs/features/terraform/tfplan-v2
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel enforcement levels documentation: https://developer.hashicorp.com/sentinel/docs/concepts/enforcement-levels
- HashiCorp Sentinel CLI configuration documentation: https://developer.hashicorp.com/sentinel/docs/configuration
- HashiCorp Sentinel `test` command documentation: https://developer.hashicorp.com/sentinel/docs/commands/test
- HCP Terraform Sentinel mock testing documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/test-sentinel
- Terraform Cloud policy quickstart: https://developer.hashicorp.com/terraform/tutorials/cloud-get-started/policy-quickstart
- Terraform Google provider `google_compute_firewall` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_firewall
- Terraform Google provider `google_storage_bucket` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Terraform Google provider `google_sql_database_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
- Terraform Enterprise provider `tfe_policy_set` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/policy_set

## Issues Found
- Clarified that Sentinel policy checks run between plan and apply in Terraform Cloud and Terraform Enterprise runs, not during a standalone local `terraform plan`.
- Updated Sentinel examples to handle optional Terraform plan attributes with `else []` so policies do not fail with runtime errors when optional nested blocks are absent.
- Updated the firewall policy to reject `protocol = "all"` as well as empty port lists when checking for rules that allow all ports.
- Corrected the SSH firewall comment. The policy blocks public SSH but does not specifically enforce the IAP CIDR range.
- Strengthened the Cloud Storage CMEK check to verify `encryption.default_kms_key_name`, not just the presence of an `encryption` block.
- Strengthened the Cloud Storage versioning check so an empty versioning block cannot pass.
- Updated the IAM policy to block `allUsers` and `allAuthenticatedUsers` in both IAM binding resources and IAM member resources.
- Updated the Cloud SQL SSL policy from deprecated `require_ssl` usage to the current `ssl_mode` values `ENCRYPTED_ONLY` and `TRUSTED_CLIENT_CERTIFICATE_REQUIRED`.
- Updated the Cloud SQL backup policy to require a backup configuration block and to only require `point_in_time_recovery_enabled` for non-MySQL database versions, matching the Google provider documentation that PITR is valid for PostgreSQL and SQL Server.

## Review Notes
The Sentinel CLI was not installed in the local environment, so the snippets were reviewed against official Sentinel and Terraform provider documentation rather than executed with `sentinel test`.
