# Validation Summary: How to Create VPC DHCP Options Sets with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- AWS VPC
- AWS DHCP Options Sets (`aws_vpc_dhcp_options`, `aws_vpc_dhcp_options_association`)
- Route 53 Resolver (inbound endpoints)
- AWS Time Sync Service
- DNS, NTP, NetBIOS (RFC 2132)

## Sources Consulted
- Terraform AWS provider — `aws_vpc_dhcp_options`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_dhcp_options
- Terraform AWS provider — `aws_vpc_dhcp_options_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_dhcp_options_association
- Terraform AWS provider — `aws_route53_resolver_endpoint`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_resolver_endpoint
- AWS VPC User Guide — DHCP options sets
- AWS EC2 User Guide — Amazon EC2 instance hostnames and DNS
- AWS docs — Amazon Time Sync Service (`169.254.169.123`)
- RFC 2132 §8.7 — NetBIOS over TCP/IP Node Type Option

## Issues Found
- **Step 4 — invalid Route 53 Resolver endpoint reference.** The original code referenced `aws_route53_resolver_endpoint.inbound_ip_1` and `aws_route53_resolver_endpoint.inbound_ip_2` directly in the `domain_name_servers` list. These evaluate to whole resource objects, not IPv4 strings, so the plan would fail. Fixed by replacing with the splat expression `aws_route53_resolver_endpoint.inbound.ip_address[*].ip`, which is the documented pattern: the resolver endpoint's `ip_address` block exposes an `ip` attribute per ENI.

## Review Notes
- `domain_name_servers`, `netbios_name_servers`, and `ntp_servers` are each capped at 4 entries by AWS — worth mentioning if the post is expanded.
- `netbios_node_type = 2` (P-node) is the value AWS explicitly recommends, since broadcast/multicast aren't supported on the VPC network. Correctly described as point-to-point.
- `169.254.169.123` is the correct IPv4 AWS Time Sync endpoint. For Nitro-based instances, IPv6 `fd00:ec2::123` is also available but out of scope here.
- `ec2.internal` is correct only for `us-east-1`; any other region uses `<region>.compute.internal` (e.g. `us-west-2.compute.internal`). The inline comment already notes this regional specificity.
- Removing the association reverts the VPC to AWS's default DHCP options set — a useful detail for the "reset" section in Step 3.
