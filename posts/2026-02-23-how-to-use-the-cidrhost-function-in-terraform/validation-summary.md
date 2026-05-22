# Validation Summary: How to Use the cidrhost Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform `cidrhost` and `cidrsubnet` functions
- HashiCorp Configuration Language (HCL)
- AWS VPC subnet addressing
- AWS EC2 instances

## Sources Consulted
- HashiCorp Terraform documentation: `cidrhost` function - https://developer.hashicorp.com/terraform/language/functions/cidrhost
- HashiCorp Terraform documentation: `cidrsubnet` function - https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform Registry documentation: `aws_instance` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS VPC documentation: Subnet CIDR blocks - https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html

## Issues Found
- The syntax section described `hostnum` as starting at 0 but did not mention Terraform's documented support for negative host numbers. Updated the description to clarify that positive values start at 0 and negative values count backward from the end of the range.

## Review Notes
- Terraform CLI was not installed in the workspace, so examples were checked against official documentation rather than local `terraform console` execution.
- The AWS examples are syntactically valid, but the hardcoded AMI IDs are region-specific and may need replacement in real deployments.
