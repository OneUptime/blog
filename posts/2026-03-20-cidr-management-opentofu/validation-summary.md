# Validation Summary: How to Manage CIDR Blocks and IP Addressing with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- CIDR and IP subnetting
- AWS VPC networking
- AWS provider resources and data sources

## Sources Consulted
- OpenTofu `cidrsubnet` documentation: https://opentofu.org/docs/language/functions/cidrsubnet/
- OpenTofu `cidrsubnets` documentation: https://opentofu.org/docs/language/functions/cidrsubnets/
- OpenTofu `cidrhost` documentation: https://opentofu.org/docs/language/functions/cidrhost/
- OpenTofu language example using `aws_subnet` with `cidrsubnet`: https://opentofu.org/docs/language/modules/develop/composition/
- AWS VPC subnet basics and subnet settings: https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html
- AWS VPC IP addressing behavior: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html
- AWS subnet sizing and reserved addresses: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html
- AWS provider `aws_availability_zones` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/availability_zones
- AWS provider `aws_eip_association` documentation note about NAT gateways managing EIP associations via `allocation_id`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/eip_association
- RFC 4632, section 3.1, CIDR notation reference: https://datatracker.ietf.org/doc/html/rfc4632#section-3.1

## Issues Found
- The `cidrhost()` section said it was for NAT gateway IP or DNS resolver use. That was misleading for AWS: NAT gateway public IPs come from Elastic IPs rather than the subnet CIDR, and AWS reserves specific subnet addresses such as the router and DNS-related addresses. I updated the note and comment so the example stays accurate.
- The conclusion described a hierarchy of regional `/16` → environment `/20` → tier `/20` → availability zone `/24`. That nests a `/20` inside another `/20`, which is not possible. I corrected the conclusion to describe `/20` as an environment or tier layer before `/24` subnet allocation.

## Review Notes
- The OpenTofu function examples and expected CIDR outputs are correct and match the documented behavior of `cidrsubnet()`, `cidrsubnets()`, and `cidrhost()`.
- The `cidrhost()` examples return mathematically correct addresses, but whether those addresses are assignable depends on the target platform. In AWS VPC subnets, the first four IPv4 addresses and the last IPv4 address in each subnet are reserved.
