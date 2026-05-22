# Validation Summary: How to Use the terraform get Command to Download Modules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI
- Terraform modules
- Terraform module sources
- HCP Terraform / Terraform Enterprise private registry authentication
- GitHub Actions CI/CD

## Sources Consulted
- HashiCorp Terraform CLI `get` command reference: https://developer.hashicorp.com/terraform/cli/commands/get
- HashiCorp Terraform CLI `init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- HashiCorp Terraform module configuration documentation: https://developer.hashicorp.com/terraform/language/modules/configuration
- HashiCorp Terraform `module` block reference: https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp Terraform CLI configuration file documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp Terraform CLI environment variables reference: https://developer.hashicorp.com/terraform/cli/config/environment-variables

## Issues Found
- The post said `terraform get -update` "forces a re-download of all modules." HashiCorp documents `-update` as checking already-downloaded modules for updates and downloading updates if present, so the wording was changed to avoid overclaiming unconditional re-download behavior.
- The module source behavior table described `-update` as always re-cloning or re-downloading by source type. Those entries were revised to describe update checks, including registry updates according to the allowed version constraint.
- The post recommended checking `.terraform/modules/modules.json` into version control for reproducibility. HashiCorp's `terraform get` documentation says the `.terraform` directory should not be committed, so this was corrected to recommend pinning module versions in configuration instead.

## Review Notes
The Terraform command examples and module source examples are otherwise consistent with the official documentation. Terraform was not installed in the local environment, so CLI behavior was verified against HashiCorp's current official documentation rather than local `terraform -help` output.
