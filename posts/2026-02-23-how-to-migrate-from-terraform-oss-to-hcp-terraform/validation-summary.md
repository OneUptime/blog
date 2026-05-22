# Validation Summary: How to Migrate from Terraform OSS to HCP Terraform

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Terraform CLI
- HCP Terraform
- Terraform cloud block
- Terraform S3 backend migration
- HashiCorp TFE Terraform provider
- HCP Terraform dynamic provider credentials for AWS
- AWS IAM OIDC provider and role trust policies
- GitHub Actions with hashicorp/tfc-workflows-github
- Sentinel policies

## Sources Consulted
- Terraform `cloud` block documentation: https://developer.hashicorp.com/terraform/language/terraform#cloud
- Terraform CLI `init` command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform CLI `login` command documentation: https://developer.hashicorp.com/terraform/cli/commands/login
- HCP Terraform dynamic provider credentials for AWS: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/dynamic-provider-credentials/aws-configuration
- TFE provider `tfe_workspace` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace
- TFE provider `tfe_workspace_settings` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_settings
- TFE provider `tfe_variable` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/variable
- TFE provider `tfe_team_access` resource documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/team_access
- HashiCorp `tfc-workflows-github` upload configuration action: https://github.com/hashicorp/tfc-workflows-github/tree/main/actions/upload-configuration
- Sentinel Terraform imports documentation: https://developer.hashicorp.com/sentinel/docs/features/terraform

## Issues Found
- The prerequisites said Terraform CLI 1.x or later was sufficient. The `cloud` block requires Terraform 1.1 or later, so the version note was corrected.
- The workspace variables example was marked as a `bash` code block even though it contains HCL. The code fence was changed to `hcl`.
- The dynamic credentials example used an invalid `setting_overwrites` block inside `tfe_workspace`. Current TFE provider guidance uses `tfe_workspace_settings` for execution mode, so the example was corrected.
- The dynamic credentials example did not enable AWS dynamic credentials in HCP Terraform. Added the required `TFC_AWS_PROVIDER_AUTH` and `TFC_AWS_RUN_ROLE_ARN` workspace environment variables.
- The batch migration script used `terraform init -migrate-state -input=false`, which cannot answer the migration prompt in non-interactive mode. Added `-force-copy` so the scripted migration can copy state without prompting.

## Review Notes
The Terraform CLI was not installed in the local environment, so CLI behavior and provider schemas were verified against official HashiCorp documentation and provider source documentation rather than local `terraform` execution.
