# Validation Summary: How to Configure AWS Egress-Only Internet Gateway with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC
- AWS Egress-Only Internet Gateway
- AWS CLI
- Terraform
- IPv6
- VPC route tables and subnets

## Sources Consulted
- AWS VPC User Guide: Enable outbound IPv6 traffic using an egress-only internet gateway — https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html
- AWS VPC User Guide: Add IPv6 support for your VPC — https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6-add.html
- AWS VPC User Guide: Modify the IP addressing attributes of your subnet — https://docs.aws.amazon.com/vpc/latest/userguide/subnet-public-ip.html
- AWS CLI Command Reference: `describe-egress-only-internet-gateways` — https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-egress-only-internet-gateways.html
- HashiCorp Terraform AWS Provider: `aws_vpc` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- HashiCorp Terraform AWS Provider: `aws_egress_only_internet_gateway` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/egress_only_internet_gateway
- HashiCorp Terraform AWS Provider: `aws_subnet` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- HashiCorp Terraform / HCL function docs: `cidrsubnet` — https://developer.hashicorp.com/terraform/language/functions/cidrsubnet

## Issues Found
- The introduction described an egress-only internet gateway as the IPv6 equivalent of a NAT Gateway. I changed this to say it provides outbound-only IPv6 internet access similar to the role a NAT Gateway plays for IPv4, which is more precise because an egress-only internet gateway is stateful but does not perform NAT.
- The subnet example comments contradicted the Terraform configuration by saying not to auto-assign IPv6 addresses while `assign_ipv6_address_on_creation = true` was enabled. I updated the comments to match AWS behavior and the example’s intent.
- The AWS CLI verification example used an `attachment.vpc-id` filter that is not documented for `describe-egress-only-internet-gateways`, and it depended on `terraform output -raw vpc_id` even though the post never defined that output. I replaced it with the documented base command from the AWS CLI reference.

## Review Notes
- The Terraform snippets are otherwise consistent with current AWS provider behavior: `assign_generated_ipv6_cidr_block` requests an Amazon-provided `/56` VPC IPv6 block, and `cidrsubnet(aws_vpc.main.ipv6_cidr_block, 8, 1)` correctly derives a `/64` subnet block from it.
- The post assumes security groups and network ACLs allow the desired IPv6 egress. AWS documentation notes that egress-only internet gateways are stateful and that subnet-level traffic controls still apply.
- This review was performed against current AWS and HashiCorp documentation; the Terraform example was not applied in a live AWS account in this environment.
