# Validation Summary: How to Call a Module from Another Directory in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform modules
- Terraform local module source paths
- Terraform path references (`path.module`, `path.root`)
- Terraform `moved` blocks
- Terraform AWS provider resources and data sources
- HCL configuration

## Sources Consulted
- Terraform module block reference: https://developer.hashicorp.com/terraform/language/block/module
- Terraform module configuration guide: https://developer.hashicorp.com/terraform/language/modules/configuration
- Terraform `terraform init` command reference: https://developer.hashicorp.com/terraform/cli/commands/init
- Terraform references to named values (`path.module`, `path.root`): https://developer.hashicorp.com/terraform/language/expressions/references
- Terraform module refactoring and `moved` blocks: https://developer.hashicorp.com/terraform/language/modules/develop/refactoring
- Terraform `cidrsubnet` function reference: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- HashiCorp AWS provider `aws_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- HashiCorp AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- HashiCorp AWS provider `aws_availability_zones` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- HashiCorp AWS provider `aws_vpc` and `aws_internet_gateway` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The post metadata said the guide covered both relative and absolute local paths, but the article only explains relative paths. Updated the description to say "relative paths" only.
- The Basic Syntax section said the module source path is relative to the file where the `module` block is defined. Terraform local module paths are resolved relative to the calling module's directory. Updated the wording to refer to the module directory.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform validate` against reconstructed examples. The snippets were reviewed against official Terraform language documentation and HashiCorp AWS provider documentation instead.
- The EC2 AMI ID in the example is region-specific; readers may need to substitute a current AMI ID for their AWS region. The surrounding Terraform syntax and module usage are correct.
