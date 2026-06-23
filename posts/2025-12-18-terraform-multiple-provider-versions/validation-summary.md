# Validation Summary: How to Use Multiple Provider Versions in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform providers and provider aliases
- Terraform modules and provider passing
- Terraform dependency lock files
- Terraform remote state
- AWS provider for Terraform
- GitHub Actions

## Sources Consulted
- Terraform provider block reference: https://developer.hashicorp.com/terraform/language/block/provider
- Terraform provider requirements: https://developer.hashicorp.com/terraform/language/providers/requirements
- Terraform providers within modules: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- Terraform providers meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/providers
- Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- Terraform init command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform override files documentation: https://developer.hashicorp.com/terraform/language/files/override
- Terraform refresh command reference: https://developer.hashicorp.com/terraform/cli/commands/refresh
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Terraform provider registry protocol reference: https://developer.hashicorp.com/terraform/internals/provider-registry-protocol
- AWS provider documentation for S3 bucket website configuration: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_website_configuration
- AWS provider documentation for S3 bucket replication configuration: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/writing-workflows/workflow-syntax-for-github-actions

## Issues Found
- The description, introduction, and provider alias diagram incorrectly implied that Terraform provider aliases can use different versions of the same provider source in a single configuration. Updated the wording and diagram to state that aliases vary provider configuration settings, while true version separation requires separate Terraform configurations.
- The module example included an `aws_s3_bucket_replication_configuration` resource that referenced `aws_s3_bucket_versioning.primary` and `aws_iam_role.replication`, neither of which was defined in the snippet. Removed that incomplete resource so the module example remains focused on provider aliases and does not contain unresolved references.
- The multi-region section said Terraform does not support dynamic provider references without qualification. Updated it to refer to traditional Terraform module configurations, since Terraform Stacks have different provider capabilities.
- The GitHub Actions example omitted the required `runs-on` field and used `terraform init` after overriding provider constraints. Added `runs-on: ubuntu-latest` and changed the init step to `terraform init -upgrade` so the matrix can update the dependency lock selection for each exact provider version.
- The state migration section used the deprecated `terraform refresh` command. Replaced it with `terraform plan -refresh-only` and `terraform apply -refresh-only`, as recommended by Terraform documentation.

## Review Notes
Terraform CLI was not installed in the local environment, so command behavior and configuration semantics were verified against official documentation rather than by running `terraform validate`.
