# Validation Summary: How to Calculate Subnet Addresses Dynamically with cidrsubnet

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform HCL
- Terraform `cidrsubnet` and `cidrsubnets` functions
- Terraform variable validation
- Terraform CLI console
- AWS VPC and subnet resources
- CIDR subnetting

## Sources Consulted
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform `cidrsubnets` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnets
- Terraform validation documentation: https://developer.hashicorp.com/terraform/language/validate
- Terraform `can` function documentation: https://developer.hashicorp.com/terraform/language/functions/can
- Terraform `pow` function documentation: https://developer.hashicorp.com/terraform/language/functions/pow
- Terraform console command documentation: https://developer.hashicorp.com/terraform/cli/commands/console
- AWS provider `aws_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- AWS provider `aws_vpc` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- RFC 4632, Classless Inter-domain Routing: https://www.rfc-editor.org/rfc/rfc4632

## Issues Found
- The conditional subnet sizing comments described `/20` and `/24` subnets as having "4096 IPs" and "256 IPs". In AWS subnet contexts, some addresses are reserved, so this could be read as usable IP counts. Changed the comments to "4096 total addresses" and "256 total addresses".
- The `vpc_cidr` validation comment said it ensured a valid CIDR and a reasonable prefix length, but the condition only checks that `cidrsubnet(var.vpc_cidr, 0, 0)` can evaluate. Changed the comment to say it ensures the CIDR is valid.

## Review Notes
- Terraform CLI was not installed in the local environment, so examples were reviewed against official documentation rather than executed with `terraform validate`.
- The dynamic subnet examples are technically correct for valid inputs, but production modules should also validate that the selected `subnet_newbits` and availability zone count leave enough `netnum` capacity for all public, private, and database subnets.
