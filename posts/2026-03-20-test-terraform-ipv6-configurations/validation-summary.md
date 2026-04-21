# Validation Summary: How to Test Terraform IPv6 Configurations

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- AWS VPC IPv6 networking
- Terratest
- Go
- AWS CLI
- Bash shell smoke tests
- DNS AAAA lookups
- IPv6 ICMP ping

## Sources Consulted
- Terraform `cidrnetmask` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrnetmask
- Terraform `cidrhost` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrhost
- Terraform validation and check block documentation: https://developer.hashicorp.com/terraform/language/validate and https://developer.hashicorp.com/terraform/language/block/check
- Terraform AWS provider `aws_vpc` and `aws_subnet` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- Terraform AWS provider `aws_vpc` and `aws_subnet` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnet
- AWS VPC IPv6 documentation: https://docs.aws.amazon.com/vpc/latest/userguide/create-vpc.html and https://docs.aws.amazon.com/vpc/latest/userguide/subnet-associate-ipv6-cidr.html
- AWS CLI `describe-vpcs` and `describe-subnets` command references: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpcs.html and https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-subnets.html
- Terratest Go package documentation: https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/terraform and https://pkg.go.dev/github.com/gruntwork-io/terratest/modules/shell

## Issues Found
- The Terraform validation examples used `cidrnetmask` for IPv6 CIDRs. Terraform documents `cidrnetmask` as IPv4-only and returning an error for IPv6, so the examples would reject valid IPv6 CIDRs. Replaced it with `cidrhost`, which supports IPv4 and IPv6, plus a colon check to keep the validation IPv6-specific.
- The default VPC IPv6 CIDR was `::/0`, which is the entire IPv6 address space and is not an appropriate VPC CIDR example. Changed it to `fd00::/56`, a more realistic ULA-sized example for validation purposes.
- The Terratest comment said it tested DNS AAAA resolution, but the code only read the `instance_ipv6` Terraform output. Updated the comment to match the code.
- The `terraform plan` example used `fd00::1:0:0/64`, which is not a canonical distinct `/64` subnet from `fd00::/64`. Changed it to `fd00:0:0:1::/64`.

## Review Notes
- Terraform, AWS CLI, and Go were not installed in the local environment, so command execution was not possible. Syntax and API usage were reviewed against official Terraform, AWS, and Terratest documentation instead.
- The examples assume the target infrastructure permits ICMPv6 and that the test runner has IPv6 reachability to the instance.
- AWS supports IPv6 subnet netmask lengths beyond `/64` in some VPC/IPAM workflows, but this post consistently uses `/64` as an explicit module policy and test expectation.
