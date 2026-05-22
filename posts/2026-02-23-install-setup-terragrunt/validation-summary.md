# Validation Summary: How to Install and Set Up Terragrunt

## Status
validated

## Post Type
Tutorial / installation and setup guide

## Technologies Covered
- Terraform
- Terragrunt
- HCL
- AWS S3 remote state
- AWS provider configuration
- Homebrew, Chocolatey, Scoop, and asdf installation workflows

## Sources Consulted
- Terragrunt installation documentation: https://docs.terragrunt.com/getting-started/install/
- Terragrunt HCL blocks reference: https://docs.terragrunt.com/reference/hcl/blocks/
- Terragrunt HCL attributes reference: https://docs.terragrunt.com/reference/hcl/attributes/
- Terragrunt CLI run command reference: https://docs.terragrunt.com/reference/cli/commands/run/
- Terragrunt CLI render command reference: https://docs.terragrunt.com/reference/cli/commands/render/
- Terragrunt CLI DAG graph command reference: https://docs.terragrunt.com/reference/cli/commands/dag/graph/
- Terragrunt CLI redesign migration guide: https://docs.terragrunt.com/migrate/cli-redesign/
- Terragrunt GitHub latest release page: https://github.com/gruntwork-io/terragrunt/releases/latest
- Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3

## Issues Found
- The post used Terragrunt `0.54.0` throughout. Updated the examples and version constraint to current Terragrunt `1.0.5`, verified against the official GitHub latest release page.
- The Linux direct-download command set `TERRAGRUNT_VERSION` without a leading `v` while also hardcoding `v${TERRAGRUNT_VERSION}`. Updated the variable and URL so the release path resolves correctly.
- The Linux direct-download command wrote directly to `/usr/local/bin`, which often fails without elevated permissions. Updated it to download locally and install with `sudo install -m 0755`.
- The guide stated Terraform was strictly required. Current Terragrunt supports OpenTofu or Terraform and defaults to OpenTofu, so the prerequisite and root configuration now clarify that this guide uses Terraform and sets `terraform_binary = "terraform"`.
- The Terraform download URL used the older `terraform.io/downloads` location. Updated it to the current HashiCorp Developer install page.
- The remote state example used DynamoDB locking, which Terraform now marks as deprecated for the S3 backend. Replaced it with `use_lockfile = true` and raised the Terraform requirement to `>= 1.10.0`.
- The root remote-state comment said Terragrunt would automatically create the S3 bucket and DynamoDB table. Current Terragrunt requires explicit backend bootstrap behavior for provisioning, so the comment now says the block generates `backend.tf`.
- The multi-module commands used deprecated `terragrunt run-all`. Updated them to `terragrunt run --all`.
- The tips used deprecated or renamed CLI forms: `render-json`, `graph-dependencies`, `TG_LOG`, `--terragrunt-parallelism`, and `--terragrunt-no-auto-init`. Updated them to `render --json`, `dag graph`, `TG_LOG_LEVEL`, `--parallelism`, and `--no-auto-init`.
- The generated provider snippet referenced `local.region` and `local.environment` without defining those locals in that snippet. Added the `read_terragrunt_config(find_in_parent_folders(...))` locals needed by the generated provider block.

## Review Notes
The post remains a valid Terragrunt setup guide after the fixes. The AWS provider version and registry module version are pinned to older but still valid versions; future maintenance could refresh them, but they are not technically incorrect.
