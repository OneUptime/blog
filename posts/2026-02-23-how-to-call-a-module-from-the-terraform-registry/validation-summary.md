# Validation Summary: How to Call a Module from the Terraform Registry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform Registry modules
- HCP Terraform private registry
- Terraform Enterprise private registry
- Terraform CLI
- AWS Terraform modules

## Sources Consulted
- HashiCorp Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- HashiCorp Terraform Registry module usage documentation: https://developer.hashicorp.com/terraform/registry/modules/use
- HashiCorp Terraform version constraint documentation: https://developer.hashicorp.com/terraform/language/expressions/version-constraints
- HashiCorp Terraform CLI configuration credentials documentation: https://developer.hashicorp.com/terraform/cli/config/config-file
- HashiCorp Terraform init command documentation: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform Registry API metadata for `terraform-aws-modules/vpc/aws` version `5.5.1`: https://registry.terraform.io/v1/modules/terraform-aws-modules/vpc/aws/5.5.1
- Terraform Registry API metadata for `terraform-aws-modules/security-group/aws` version `5.1.0`: https://registry.terraform.io/v1/modules/terraform-aws-modules/security-group/aws/5.1.0
- Terraform Registry API metadata for `terraform-aws-modules/alb/aws` version `9.4.0`: https://registry.terraform.io/v1/modules/terraform-aws-modules/alb/aws/9.4.0
- Terraform Registry API metadata for `terraform-aws-modules/iam/aws` version `5.33.0`: https://registry.terraform.io/v1/modules/terraform-aws-modules/iam/aws/5.33.0

## Issues Found
- The pessimistic constraint example used `version = "~> 5.5"` while the comment said it allows `5.5.x` but not `5.6.0`. Terraform's `~>` operator allows the right-most specified version component to increment, so `~> 5.5` allows versions below `6.0`. Changed the example to `version = "~> 5.5.0"` so the comment is accurate.
- The private registry section referred to "Terraform Cloud," which is now documented by HashiCorp as HCP Terraform. Updated the wording and code comment to "HCP Terraform / Terraform Enterprise."

## Review Notes
The registry module source syntax, `version` usage, submodule `//` syntax, private registry source format, CLI credentials block, `TF_TOKEN_app_terraform_io` environment variable, and `terraform init -upgrade` command were verified against official HashiCorp documentation. The referenced AWS registry module versions exist in the Terraform Registry. Terraform CLI was not installed in the workspace, so no local `terraform validate` run was possible.
