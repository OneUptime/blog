# Validation Summary: How to Set Up Dual-Stack VPCs with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS VPC
- AWS provider for OpenTofu
- IPv4
- IPv6
- Dual-stack networking
- AWS Internet Gateway
- AWS Egress-Only Internet Gateway
- AWS NAT Gateway

## Sources Consulted
- OpenTofu `cidrsubnet` function: https://opentofu.org/docs/language/functions/cidrsubnet/
- OpenTofu CLI overview: https://opentofu.org/docs/cli/commands/
- OpenTofu `init` command: https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS VPC CIDR blocks: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- AWS subnet route tables: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- AWS subnet IP addressing attributes: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-public-ip.html
- AWS egress-only internet gateways: https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html
- AWS NAT gateway use cases: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html
- AWS provider `aws_vpc` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- AWS provider `aws_nat_gateway` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- AWS provider `aws_route_table_association` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association
- AWS provider `aws_availability_zones` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones

## Issues Found
- The post referenced `var.availability_zones` without declaring it anywhere. That would cause the configuration to fail as written. I replaced it with the official `aws_availability_zones` data source and used its `names` output to drive subnet creation.
- The post created custom public and private route tables but never associated them with the subnets. In AWS, subnets use the main route table unless explicitly associated with a custom table. I added `aws_route_table_association` resources for both the public and private subnets so the routing behavior matches the explanation.
- The NAT gateway example omitted the provider-recommended explicit dependency on the Internet Gateway. I added `depends_on = [aws_internet_gateway.dual_stack]` to make creation ordering reliable for a public NAT gateway.
- The prerequisites did not mention that the AWS provider also needs a configured region. I updated the prerequisites accordingly.

## Review Notes
- The post is technically correct after the fixes above.
- The environment used for review did not have the `tofu` CLI installed, so the command syntax was checked against the current OpenTofu CLI documentation rather than local `--help` output.
- The design uses a single NAT gateway in the first public subnet. This is valid, but a NAT gateway per Availability Zone would improve resiliency and avoid cross-AZ egress dependencies for private subnets.
