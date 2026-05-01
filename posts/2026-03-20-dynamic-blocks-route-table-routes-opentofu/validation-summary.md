# Validation Summary: How to Use Dynamic Blocks for Route Table Routes in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- AWS VPC route tables
- AWS NAT gateways
- AWS VPC peering
- AWS Transit Gateway
- AWS provider inline `route` blocks

## Sources Consulted
- OpenTofu dynamic blocks documentation: https://opentofu.org/docs/v1.9/language/expressions/dynamic-blocks/
- OpenTofu type constraints and optional object attributes: https://opentofu.org/docs/language/expressions/type-constraints/
- OpenTofu attributes-as-blocks documentation: https://opentofu.org/docs/language/attr-as-blocks/
- AWS provider `aws_route_table` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- AWS provider `aws_route` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route

## Issues Found
- The post did not mention that `aws_route_table.route` uses attributes-as-blocks behavior. With `dynamic "route"`, an empty `for_each` emits no blocks, which means existing inline routes are ignored rather than removed. I added a sentence explaining that `route = []` is required to clear managed inline routes.
- The post did not mention that inline `route` blocks in `aws_route_table` must not be mixed with standalone `aws_route` resources. I added this caveat to prevent conflicting management of the same route table routes.

## Review Notes
- The code samples are syntactically valid for OpenTofu and align with the current AWS provider schema for inline `route` blocks.
- The examples intentionally focus on IPv4 `cidr_block` destinations and a subset of supported route targets. The provider also supports IPv6 destinations, managed prefix lists, and additional target arguments such as `egress_only_gateway_id`, `network_interface_id`, and `vpc_endpoint_id`.
