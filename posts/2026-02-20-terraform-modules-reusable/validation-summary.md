# Validation Summary: How to Write Reusable Terraform Modules

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform modules
- Terraform input variables and validation blocks
- Terraform outputs
- Terraform module sources and Git refs
- AWS VPC networking with the Terraform AWS provider
- OneUptime monitoring

## Sources Consulted
- HashiCorp Terraform modules overview: https://developer.hashicorp.com/terraform/language/modules
- HashiCorp Terraform module sources: https://developer.hashicorp.com/terraform/language/modules/sources
- HashiCorp Terraform output values: https://developer.hashicorp.com/terraform/language/values/outputs
- HashiCorp Terraform `element` function: https://developer.hashicorp.com/terraform/language/functions/element
- HashiCorp Terraform validation command reference: https://developer.hashicorp.com/terraform/cli/commands/validate
- HashiCorp AWS provider `aws_vpc` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- HashiCorp AWS provider `aws_subnet` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- HashiCorp AWS provider `aws_internet_gateway` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/internet_gateway
- HashiCorp AWS provider `aws_eip` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- HashiCorp AWS provider `aws_nat_gateway` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- HashiCorp AWS provider `aws_route_table` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- HashiCorp AWS provider `aws_route_table_association` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association
- OneUptime official website: https://oneuptime.com/

## Issues Found
- The VPC module labeled subnets as public and private but did not create route tables or route table associations. Without a `0.0.0.0/0` route to the internet gateway, public subnets would not have outbound internet routing; without a private route to the NAT gateway, private subnets would not get the described NAT-based internet access. Added public and private route tables plus subnet associations.
- The NAT gateway resources were created when private subnet CIDRs existed, even if no public subnet CIDRs existed. That would make `aws_subnet.public[0]` invalid. Updated the NAT gateway, EIP, private route table, private route table association, and NAT output condition to require public and private subnets.
- The `nat_gateway_ip` output only checked `enable_nat_gateway`, so it could index `aws_eip.nat[0]` when no EIP was created. Updated it to use the same NAT creation condition as the resources.
- The module accepted an empty availability zone list, and direct list indexing could also fail if more subnet CIDRs than availability zones were provided. Added a validation block requiring at least one availability zone and used Terraform's `element` function for availability zone selection.

## Review Notes
The corrected example is technically consistent with the documented Terraform module, output, module source, and AWS provider resource behavior. Local validation with `terraform validate` was not run because the Terraform CLI is not installed in the workspace.
