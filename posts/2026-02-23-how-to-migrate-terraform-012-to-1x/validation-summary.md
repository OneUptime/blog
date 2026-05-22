# Validation Summary: How to Migrate Terraform 0.12 to 1.x

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Terraform CLI
- Terraform configuration language (HCL)
- Terraform provider requirements
- Terraform state upgrades
- tfenv

## Sources Consulted
- HashiCorp Terraform `0.13upgrade` command reference: https://developer.hashicorp.com/terraform/cli/commands/0.13upgrade
- HashiCorp Terraform dependency lock file documentation: https://developer.hashicorp.com/terraform/language/files/dependency-lock
- HashiCorp Terraform `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp HCP Terraform version upgrade tutorial: https://developer.hashicorp.com/terraform/tutorials/cloud/cloud-versions
- HashiCorp Terraform 1.5 import and check blocks announcement: https://www.hashicorp.com/en/blog/terraform-1-5-brings-config-driven-import-and-checks
- HashiCorp Terraform moved block/refactoring documentation: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- HashiCorp Terraform provider-defined functions documentation: https://developer.hashicorp.com/terraform/plugin/framework/functions
- HashiCorp Terraform v0.15.0 release notes: https://github.com/hashicorp/terraform/releases/tag/v0.15.0
- HashiCorp Terraform upgrade guide index for current 1.x series: https://developer.hashicorp.com/terraform/language/upgrade-guides

## Issues Found
- The 0.13 provider example showed a provider version constraint appearing in `required_providers` even though the before example did not include one. Updated the before example to include the 0.12-style provider `version` argument and clarified that the requirement is moved into `required_providers`.
- The Step 3 section attributed module `count` support to Terraform 0.15. Module `count` was introduced earlier in Terraform 0.13, so the incorrect example was removed from the 0.15 changes list.
- The post described interpolation-only expressions as not working in later versions. They are deprecated and should be modernized, but Terraform 0.15 release notes indicate `terraform fmt` can automatically fix most interpolation-only cases. Updated the wording accordingly.
- The `terraform fmt` command was described as fixing common syntax issues. Changed this to say it formats configuration after syntax updates.
- The AWS provider compatibility comment implied AWS provider `>= 4.0` specifically requires Terraform `>= 0.13`. Updated the comment to clarify that the snippet uses Terraform 0.13+ provider source syntax.
- The automation script used Terraform `1.9.8` as the latest 1.x version. Updated the example to `1.15.0` to match the current 1.x series shown in the official HashiCorp upgrade guide index.
- The automation script did not run `terraform 0.13upgrade` during the 0.13 step. Added the command with `-yes` for non-interactive script usage.
- The automation script treated all non-zero `terraform plan -detailed-exitcode` results as changes. Updated it to distinguish exit code `2` for changes from exit code `1` for errors.

## Review Notes
The guide is technically relevant and valid after the corrections. Future updates should refresh the "latest 1.x" example version when HashiCorp publishes newer 1.x releases.
