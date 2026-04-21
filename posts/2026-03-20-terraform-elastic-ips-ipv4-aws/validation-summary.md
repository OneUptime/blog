# Validation Summary: How to Allocate Elastic IPs for IPv4 Using Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS Elastic IP
- Amazon EC2
- AWS NAT Gateway
- AWS public IPv4 pricing

## Sources Consulted
- AWS EC2 Elastic IP addresses documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- Amazon VPC public IPv4 pricing documentation: https://aws.amazon.com/vpc/pricing/
- HashiCorp Terraform AWS Provider `aws_eip` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- HashiCorp Terraform AWS Provider `aws_eip_association` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip_association
- HashiCorp Terraform AWS Provider `aws_nat_gateway` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- Terraform `terraform import` command documentation: https://developer.hashicorp.com/terraform/cli/commands/import
- Terraform lifecycle meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle

## Issues Found
- The lifecycle comments and conclusion used outdated AWS Elastic IP billing guidance, saying EIPs are free when associated with running instances and only charged when unassociated. AWS now charges for all Elastic IP addresses and public IPv4 addresses whether associated or idle, so the billing language was updated.
- The conclusion said EC2 instances and NAT gateways are both associated with EIPs via `aws_eip_association`. Terraform's AWS provider documents that NAT gateways should use the NAT gateway `allocation_id` argument, while `aws_eip_association` is for EC2 instances or network interfaces. The conclusion was corrected.

## Review Notes
The Terraform snippets are partial examples and assume the referenced provider configuration, AMI data source, subnet, security group, internet gateway, and instance collections exist elsewhere. Terraform CLI is not installed in this workspace, so local `terraform validate` could not be run; snippets were checked against the official Terraform AWS provider documentation.
