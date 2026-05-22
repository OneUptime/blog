# Validation Summary: How to Use the chunklist Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform configuration language
- Terraform collection functions
- Terraform provisioners
- AWS VPC security groups
- AWS VPC route tables

## Sources Consulted
- HashiCorp Terraform `chunklist` function documentation: https://developer.hashicorp.com/terraform/language/functions/chunklist
- HashiCorp Terraform `ceil` function documentation: https://developer.hashicorp.com/terraform/language/functions/ceil
- HashiCorp Terraform `flatten` function documentation: https://developer.hashicorp.com/terraform/language/functions/flatten
- HashiCorp Terraform `concat` function documentation: https://developer.hashicorp.com/terraform/language/functions/concat
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- AWS Amazon VPC quotas documentation: https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- AWS subnet route tables documentation: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- Terraform AWS Provider `aws_security_group` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS Provider `aws_route` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route

## Issues Found
- The route table example originally implied that `chunklist` could be used generally to split routes across multiple route tables because of per-table route limits. In AWS, each subnet is associated with one route table at a time, so splitting required routes across multiple route tables can change routing behavior unless those tables are intentionally used by different subnet groups. Updated the section wording to clarify that `chunklist` is appropriate when different subnet groups use different route tables.

## Review Notes
- Terraform and OpenTofu CLIs were not installed in the workspace, so examples were reviewed against official documentation rather than executed locally.
- The AWS Provider documentation recommends separate `aws_vpc_security_group_ingress_rule` resources as the current best practice instead of inline `ingress` blocks on `aws_security_group`, but inline rules remain documented and valid.
