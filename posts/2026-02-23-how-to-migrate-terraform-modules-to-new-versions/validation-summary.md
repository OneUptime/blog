# Validation Summary: How to Migrate Terraform Modules to New Versions

## Status
validated

## Post Type
Guide

## Technologies Covered
- Terraform modules
- Terraform Registry module version constraints
- Git-sourced Terraform modules
- Terraform CLI commands: `init`, `plan`, `state mv`, and `workspace select`
- terraform-aws-modules VPC module
- Dependabot configuration for Terraform

## Sources Consulted
- HashiCorp Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp Terraform module configuration guide: https://developer.hashicorp.com/terraform/language/modules/configuration
- HashiCorp Terraform version constraints reference: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- HashiCorp Terraform `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform `plan` command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- HashiCorp Terraform `state mv` command reference: https://developer.hashicorp.com/terraform/cli/commands/state/mv
- HashiCorp Terraform module refactoring and `moved` blocks guide: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Terraform `workspace delete` command reference: https://developer.hashicorp.com/terraform/cli/commands/workspace/delete
- terraform-aws-modules VPC module repository and v5.0.0 source: https://github.com/terraform-aws-modules/terraform-aws-vpc
- GitHub Dependabot configuration options reference: https://docs.github.com/en/code-security/dependabot/dependabot-version-updates/configuration-options-for-the-dependabot.yml-file

## Issues Found
- The VPC module v5 example described `enable_nat_gateway` as a new required variable. In terraform-aws-modules/vpc/aws v5.0.0 it is an optional boolean input with a default of `false`, so the comment was changed to describe it as an optional setting used to preserve the intended NAT gateway behavior.
- The resource-move section said to use moved blocks, but the example was a shell command and the wording did not distinguish between module-authored `moved` blocks and a consumer's manual `terraform state mv` fallback. The wording and code fence were corrected.
- The output-renaming example used `module.vpc.private_subnet_ids`, which was not an output in the checked v3.19.0 or v5.0.0 versions of the terraform-aws-modules VPC module. The example was changed to a generic module output rename.
- The incremental upgrade example listed `4.16.0` as the latest 4.x version of terraform-aws-modules/vpc/aws, but the module's v4 tag series ends at `4.0.2`. The version was corrected to `4.0.2`.
- The testing section suggested creating a brand-new workspace to test a module upgrade, which would not validate migration behavior against existing managed infrastructure because a new workspace has separate state. The instructions now refer to a non-production workspace or state that already manages equivalent infrastructure.

## Review Notes
Terraform CLI was not installed in the local workspace, so CLI behavior was validated against HashiCorp's official command documentation rather than local `terraform --help` output.
