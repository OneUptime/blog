# Validation Summary: How to Create a VPC with IPv4 CIDR Using Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure as Code guide

## Technologies Covered
- Terraform CLI and HCL
- HashiCorp AWS Provider
- AWS VPC
- AWS Internet Gateway
- AWS Route Tables
- AWS DHCP option sets
- Amazon DNS / Route 53 Resolver

## Sources Consulted
- HashiCorp AWS Provider v5.100.0 `aws_vpc` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v5.100.0/website/docs/r/vpc.html.markdown
- HashiCorp AWS Provider v5.100.0 `aws_internet_gateway` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v5.100.0/website/docs/r/internet_gateway.html.markdown
- HashiCorp AWS Provider v5.100.0 `aws_default_route_table` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v5.100.0/website/docs/r/default_route_table.html.markdown
- HashiCorp AWS Provider v5.100.0 `aws_vpc_dhcp_options` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v5.100.0/website/docs/r/vpc_dhcp_options.html.markdown
- HashiCorp AWS Provider v5.100.0 `aws_vpc_dhcp_options_association` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/v5.100.0/website/docs/r/vpc_dhcp_options_association.html.markdown
- AWS EC2 API `CreateDhcpOptions` documentation: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_CreateDhcpOptions.html
- AWS VPC DHCP option sets documentation: https://docs.aws.amazon.com/vpc/latest/userguide/DHCPOptionSet.html
- AWS VPC Amazon DNS concepts and DNS attributes documentation: https://docs.aws.amazon.com/vpc/latest/userguide/AmazonDNS-concepts.html
- Terraform CLI `init`, `plan`, `apply`, and `output` command references: https://developer.hashicorp.com/terraform/cli/commands

## Issues Found
1. **Region-specific DHCP domain name was hardcoded.** The post used `domain_name = "ec2.internal"` while also exposing `var.region`. AWS documents `ec2.internal` for `us-east-1` with `AmazonProvidedDNS`, and `region.compute.internal` for other Regions. Updated the Terraform snippet to derive the DHCP domain name from `var.region`.
2. **DNS hostname explanation was incomplete.** The conclusion said to enable only `enable_dns_hostnames` for EC2 instances to receive public DNS names. AWS requires both `enableDnsHostnames` and `enableDnsSupport`, and the instance must have a public IPv4 address or Elastic IP. Updated the conclusion to include both VPC DNS attributes and the public IPv4 condition.

## Review Notes
- The Terraform resource names, arguments, output references, and CLI commands are current and valid for the pinned HashiCorp AWS Provider `~> 5.0` line.
- `aws_default_route_table` is valid here, but it is an adoption-style Terraform resource with special behavior: it manages the VPC default route table rather than creating a new route table.
- The deploy commands pass variable values that match the defaults. If future examples use non-default values, the same variables should be passed to `terraform apply` or a saved plan file should be applied.
- Terraform CLI was not installed in the local environment, so `terraform validate` could not be run.
