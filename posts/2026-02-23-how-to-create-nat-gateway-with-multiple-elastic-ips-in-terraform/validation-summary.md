# Validation Summary: How to Create NAT Gateway with Multiple Elastic IPs in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (v1.0+)
- Terraform AWS provider (v5.x)
- AWS VPC
- AWS NAT Gateway
- AWS Elastic IP (EIP)
- AWS Internet Gateway
- AWS Subnets and Route Tables
- AWS Availability Zones

## Sources Consulted
- Terraform AWS provider `aws_nat_gateway` resource docs — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway
- Terraform AWS provider `aws_eip` resource docs — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip
- Terraform AWS provider `aws_vpc` / `aws_subnet` / `aws_route_table` docs — https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS Blog: "Attach multiple IPs to a NAT Gateway to scale your egress traffic pattern" — https://aws.amazon.com/blogs/networking-and-content-delivery/attach-multiple-ips-to-a-nat-gateway-to-scale-your-egress-traffic-pattern/
- hashicorp/terraform-provider-aws GitHub issue #29471 (secondary_allocation_ids feature)
- hashicorp/terraform-provider-aws GitHub issue #26714 (aws_eip `domain` replacing deprecated `vpc`)

## Issues Found
- **Inaccurate claim about NAT Gateway single-EIP limitation (fixed).** The "Configuring Additional Elastic IPs for a Single NAT Gateway" section stated: "While AWS NAT Gateways support only one primary Elastic IP, you can work around this with multiple NAT Gateways sharing the load." This is outdated — since 2023 AWS NAT Gateways support up to 8 Elastic IPs per gateway (1 primary + 7 secondary), and the Terraform `aws_nat_gateway` resource exposes this via the `secondary_allocation_ids` argument. The section was rewritten to demonstrate `secondary_allocation_ids` with a working example, then retain the existing outputs block (still useful for the multi-AZ allowlisting case). This was particularly important to fix because it is the exact feature the post's title promises.

## Review Notes
- The remaining Terraform code is correct against the current AWS provider v5.x: `aws_eip` uses `domain = "vpc"` (the replacement for the deprecated `vpc = true` boolean), `aws_nat_gateway` arguments (`allocation_id`, `subnet_id`, `secondary_allocation_ids`, `tags`) are accurate, and `cidrsubnet(aws_vpc.main.cidr_block, 8, count.index)` correctly carves /24 subnets out of the /16 VPC.
- The `depends_on = [aws_internet_gateway.main]` on `aws_eip.nat` is not strictly necessary (EIP allocation does not require an IGW), but it is harmless and matches the upstream Terraform NAT-gateway example, so it was left in place.
- `data.aws_availability_zones.available.names` returns AZs in alphabetical/ID order; using `count = 3` against it assumes the region has at least 3 AZs (true for `us-east-1`). A future improvement could use `length(...)` and `slice(...)` to make this region-agnostic, but it is not technically incorrect for the stated `us-east-1` example.
- The `aws_route_table` inline `route` block is still supported but HashiCorp's docs recommend the separate `aws_route` resource for complex topologies; both approaches work and the inline form is appropriate at this tutorial's scale.
