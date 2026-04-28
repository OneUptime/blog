# Validation Summary: How to Create a NAT Gateway with OpenTofu on AWS - A Practical Guide

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- OpenTofu (v1.6+)
- AWS (NAT Gateway, Elastic IP, VPC, Route Tables, Subnets)
- Terraform AWS Provider (hashicorp/aws ~> 5.0)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- OpenTofu documentation: https://opentofu.org/docs/
- OpenTofu v1.6 release notes (January 2024): https://opentofu.org/blog/opentofu-1-6-is-out/
- Terraform AWS Provider — `aws_nat_gateway` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- Terraform AWS Provider — `aws_eip` resource (v5.0+ `domain` argument replacing deprecated `vpc`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- Terraform AWS Provider — `aws_route_table` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- Terraform AWS Provider — `aws_route_table_association` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association
- AWS NAT Gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html

## Issues Found
No technical issues found.

## Review Notes
- The `aws_eip` resource correctly uses `domain = "vpc"` (the modern argument since AWS provider v5.0; the previous `vpc = true` is deprecated).
- The `aws_nat_gateway` resource correctly places gateways in public subnets and references EIP allocation IDs — this matches the AWS requirement that NAT Gateways be deployed in public subnets to reach the IGW.
- The author's note about adding `depends_on = [aws_internet_gateway.main]` is an appropriate caveat — the AWS provider docs explicitly recommend this when the IGW is in the same configuration.
- One minor design observation (not a technical error): Step 5 introduces an alternative `aws_nat_gateway.single` resource for non-production, but it reuses `aws_eip.nat[0]` from Step 2 (which provisions one EIP per AZ). If a user adopts only the "single NAT" pattern, they'd want to similarly gate the EIP count. This is an architectural choice presented as an alternative rather than a bug, so the code itself is valid as written.
- The splat expressions in outputs (`aws_nat_gateway.main[*].id`, `aws_eip.nat[*].public_ip`) are valid HCL and produce correct list outputs.
- The recommendation in the conclusion (one NAT Gateway per AZ to avoid cross-AZ data-transfer charges) aligns with AWS architectural best practices.
