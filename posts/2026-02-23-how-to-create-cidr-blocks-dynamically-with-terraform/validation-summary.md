# Validation Summary: How to Create CIDR Blocks Dynamically with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform HCL
- Terraform CIDR functions: `cidrsubnet`, `cidrhost`, `cidrnetmask`, `cidrsubnets`
- AWS VPC
- AWS subnets
- AWS Elastic Network Interfaces

## Sources Consulted
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- Terraform `cidrhost` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- Terraform `cidrnetmask` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrnetmask
- Terraform `cidrsubnets` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnets
- Terraform AWS provider `aws_availability_zones` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- Terraform AWS provider `aws_subnet` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- Terraform AWS provider `aws_network_interface` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_interface
- AWS VPC subnet CIDR block documentation: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html

## Issues Found
- The `cidrhost` example labeled `10.0.1.1` and `10.0.1.2` as reservable infrastructure IPs, including an AWS VPC DNS comment. AWS reserves the first four and last IP addresses in each subnet, and the DNS server is based on the VPC primary CIDR plus two. Updated the example to use assignable host numbers and added a short note about AWS-reserved subnet addresses.
- The reusable module snippet referenced `data.aws_availability_zones.available` without declaring the data source. Added the missing `aws_availability_zones` data source.
- The availability zone examples used only `state = "available"`. The AWS provider documentation notes that Local Zones can be included when enabled, so the examples now filter for `opt-in-status = "opt-in-not-required"` to return standard Availability Zones.

## Review Notes
Terraform was not installed in the local environment, so examples were reviewed statically against official Terraform and AWS documentation rather than executed with `terraform validate`. The CIDR calculations and non-overlapping subnet examples were checked manually and are consistent with Terraform's documented function behavior.
