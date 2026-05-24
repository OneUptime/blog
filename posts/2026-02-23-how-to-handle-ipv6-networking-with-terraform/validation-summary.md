# Validation Summary: How to Handle IPv6 Networking with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.0)
- HashiCorp AWS provider (~> 5.0)
- AWS VPC, subnets, route tables
- AWS Internet Gateway and Egress-Only Internet Gateway
- AWS NAT Gateway, Elastic IP
- AWS Security Groups and Network ACLs
- AWS Application Load Balancer (ALB)
- IPv6 (dual-stack, IPv6-only, DNS64)
- Terraform `cidrsubnet` function

## Sources Consulted
- Terraform AWS provider documentation (registry.terraform.io/providers/hashicorp/aws/latest/docs):
  - `aws_vpc` (`assign_generated_ipv6_cidr_block` provisions a /56)
  - `aws_subnet` (`ipv6_cidr_block`, `assign_ipv6_address_on_creation`, `ipv6_native`, `enable_dns64`, `enable_resource_name_dns_aaaa_record_on_launch`)
  - `aws_route_table` (inline `route` blocks use `ipv6_cidr_block`, `egress_only_gateway_id`, `gateway_id`)
  - `aws_eip` (v5.x: `domain = "vpc"` replaces deprecated `vpc = true`)
  - `aws_security_group` (`ipv6_cidr_blocks`)
  - `aws_network_acl_rule` (singular `ipv6_cidr_block`)
  - `aws_lb` (`ip_address_type = "dualstack"`)
  - `aws_egress_only_internet_gateway`
- Terraform language docs: `cidrsubnet(prefix, newbits, netnum)` semantics
- AWS VPC IPv6 documentation: Amazon-provided /56 CIDR allocation, /64 subnet sizing requirement, egress-only IGW behavior

## Issues Found
No technical issues found. All resource names, attribute names, attribute types, and the `cidrsubnet` math (56 + 8 newbits = /64) are accurate for AWS provider v5.x. The conceptual descriptions (EIGW as IPv6-equivalent stateful outbound, dual-stack behavior, ALB `dualstack` mode, AWS providing /56 from Amazon's pool at no charge) are all correct.

## Review Notes
- The post describes the Egress-Only Internet Gateway as the "IPv6 equivalent of a NAT Gateway." Strictly, EIGW does not perform NAT (IPv6 addresses are globally unique), but it is a useful analogy since it provides the same stateful outbound-only semantics for IPv6 that NAT provides for IPv4. This is a fair conceptual framing for a tutorial.
- For ALBs, `ip_address_type` also supports `"dualstack-without-public-ipv4"` in addition to `"ipv4"` and `"dualstack"` — a future enhancement worth mentioning for IPv6-preferred deployments, but not an error.
- The `ipv6_native` subnet uses `enable_dns64 = true`; for that to be useful, the subnet needs a route for `64:ff9b::/96` to the NAT Gateway. The post does not show this route, but the section is brief and intended as an introduction to the attribute rather than a complete DNS64/NAT64 walkthrough.
- The standalone `aws_route` resource uses `destination_ipv6_cidr_block` (not `ipv6_cidr_block`), but the post correctly uses inline `route` blocks within `aws_route_table`, where the attribute name `ipv6_cidr_block` is the correct one.
