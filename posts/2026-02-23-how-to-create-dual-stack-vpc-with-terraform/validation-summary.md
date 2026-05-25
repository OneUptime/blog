# Validation Summary: How to Create Dual-Stack VPC with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon VPC
- IPv4 and IPv6 dual-stack networking
- AWS subnets, route tables, security groups, and network ACLs
- Internet gateways, egress-only internet gateways, NAT gateways, and Elastic IPs

## Sources Consulted
- Terraform AWS Provider documentation for `aws_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- Terraform AWS Provider documentation for `aws_subnet`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- Terraform AWS Provider documentation for `aws_internet_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/internet_gateway
- Terraform AWS Provider documentation for `aws_egress_only_internet_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/egress_only_internet_gateway
- Terraform AWS Provider documentation for `aws_nat_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- Terraform AWS Provider documentation for `aws_route_table` and `aws_route_table_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- Terraform AWS Provider documentation for `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS Provider documentation for `aws_network_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl
- Terraform language documentation for `cidrsubnet`: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- AWS VPC documentation for VPC CIDR blocks and IPv6 CIDR blocks: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- AWS VPC documentation for egress-only internet gateways: https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html
- AWS VPC documentation for AWS services that support IPv6: https://docs.aws.amazon.com/vpc/latest/userguide/aws-ipv6-support.html

## Issues Found
- The NAT gateway example did not explicitly depend on the internet gateway. The Terraform AWS Provider documentation recommends adding `depends_on = [aws_internet_gateway.example]` for public NAT gateways to ensure proper creation ordering. I added `depends_on = [aws_internet_gateway.main]` to the `aws_nat_gateway.main` resource.

## Review Notes
- Terraform and OpenTofu were not installed in the local environment, so I could not run `terraform validate` or `tofu validate`. The HCL snippets were reviewed manually against the current provider resource schemas.
- The security group example uses inline `ingress` and `egress` blocks, which are still valid. The current AWS provider documentation recommends the newer standalone `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for larger rule sets, but the inline example remains technically correct.
- The subnet examples derive `/64` IPv6 subnet CIDR blocks from the Amazon-provided `/56` VPC CIDR using `cidrsubnet(..., 8, ...)`, which matches the documented Terraform behavior and AWS subnet requirements for this configuration.
