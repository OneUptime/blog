# Validation Summary: How to Use Dynamic Blocks for Route Table Routes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform dynamic blocks
- Terraform AWS provider
- AWS VPC route tables
- AWS VPC routes
- AWS IPv6 egress-only internet gateways

## Sources Consulted
- Terraform dynamic blocks documentation: https://developer.hashicorp.com/terraform/language/expressions/dynamic-blocks
- Terraform type constraints and optional object attributes documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints
- Terraform AWS provider `aws_route_table` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- Terraform AWS provider `aws_route` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- AWS VPC route table documentation: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html
- AWS egress-only internet gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html

## Issues Found
- The separate `aws_route` section said adding or removing a route does not force Terraform to recreate the entire route table. The AWS provider documentation supports standalone route management and warns not to mix inline routes with `aws_route`, but the original wording overstated the inline-route replacement behavior. Updated the text to emphasize independent route resources and the required no-mixing caveat.
- The IPv6 example defined a default `::/0` route with both `gateway_id` and `egress_only_gateway_id` set to `null`. AWS provider route blocks require one destination and one target, so that default route would be invalid. Updated the example to create an `aws_egress_only_internet_gateway`, use it as the default IPv6 route target, and use `lookup(..., null)` for optional IPv6 route target attributes.

## Review Notes
Terraform was not installed in the local environment, so validation was performed by reviewing the snippets against official Terraform language documentation, the Terraform AWS provider resource documentation, and AWS VPC routing documentation rather than running `terraform validate`.
