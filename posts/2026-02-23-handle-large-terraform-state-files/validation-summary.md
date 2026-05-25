# Validation Summary: How to Handle Large Terraform State Files

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform CLI
- Terraform state management
- Terraform S3 backend
- AWS provider configuration
- HCP Terraform and Terraform Enterprise

## Sources Consulted
- Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform `state pull` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/pull
- Terraform state CLI tutorial, including `state mv -state-out`: https://developer.hashicorp.com/terraform/tutorials/state/state-cli
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- HCP Terraform limits article: https://support.hashicorp.com/hc/en-us/articles/4414055267603-HCP-Terraform-Limits
- Terraform Enterprise state file size known issue: https://support.hashicorp.com/hc/en-us/articles/38467529879059--TFE-Issue-uploading-state-files-larger-than-512MB

## Issues Found
- The explanation said every resource requires at least one provider API call during refresh. Terraform asks providers to read current objects, but the exact API behavior is provider- and resource-specific. Updated the wording to say managed resources usually involve cloud provider API calls and that many resources require one or more calls.
- The AWS provider optimization section presented `skip_requesting_account_id` as a general way to save one API call per plan. The official AWS provider docs describe it primarily for AWS-compatible implementations that lack IAM, STS, or metadata APIs, with caveats for account-ID-dependent attributes. Reworded the section and comments to avoid recommending it as a general AWS performance setting.
- The S3 backend example used deprecated `dynamodb_table` state locking. The official S3 backend docs now recommend `use_lockfile = true` for S3 state locking and mark DynamoDB-based locking as deprecated. Updated the snippet to use `use_lockfile = true`.
- The S3 backend example included `force_path_style = false`, which is deprecated and does not ensure regional endpoint use. Removed it and updated the comment to focus on locating the bucket in the same region as Terraform runners.
- The backend section referred to Terraform Cloud state size limits in plan tiers. Current naming is HCP Terraform, and the public limits documentation emphasizes fair-use, resource, state retention, and concurrent run limits rather than a simple plan-tier state-size table. Updated the section to refer to HCP Terraform and Terraform Enterprise platform/run constraints more generally.

## Review Notes
- Terraform CLI commands and flags used in the post, including `terraform state pull`, `terraform state list`, `terraform state rm`, `terraform state mv -state-out`, `terraform plan -refresh=false`, `terraform plan -target`, and `-parallelism`, match the official Terraform documentation.
- Terraform CLI was not installed in the local workspace, so command verification was performed against official HashiCorp documentation rather than local `terraform --help` output.
