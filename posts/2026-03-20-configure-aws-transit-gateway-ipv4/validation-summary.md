# Validation Summary: How to Configure AWS Transit Gateway for IPv4

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Transit Gateway
- Amazon VPC
- AWS CLI
- OpenTofu
- HashiCorp AWS provider
- IPv4 routing

## Sources Consulted
- AWS Transit Gateway VPC attachments: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- AWS Transit Gateway route tables: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html
- AWS CLI `describe-transit-gateway-route-tables`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-transit-gateway-route-tables.html
- AWS CLI `search-transit-gateway-routes`: https://docs.aws.amazon.com/cli/latest/reference/ec2/search-transit-gateway-routes.html
- AWS provider `aws_ec2_transit_gateway` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway.html.markdown
- AWS provider `aws_ec2_transit_gateway_vpc_attachment` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway_vpc_attachment.html.markdown
- AWS provider `aws_ec2_transit_gateway_route_table_association` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway_route_table_association.html.markdown
- AWS provider `aws_ec2_transit_gateway_route` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway_route.html.markdown
- AWS provider `aws_route` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route.html.markdown

## Issues Found
- The custom TGW route table example created a route table and a static route but never associated any attachment with that custom route table, so the custom table would not actually be used for traffic. I fixed this by adding `aws_ec2_transit_gateway_route_table_association` for `vpc_a` and by updating the `vpc_a` attachment to disable default route table association so the provider configuration is valid.
- The custom route table example referenced `aws_ec2_transit_gateway_vpc_attachment.shared`, which was not defined anywhere in the post. I corrected the example to use the existing `vpc_b` attachment and `aws_vpc.vpc_b.cidr_block`.
- The VPC attachment example did not mention the AWS requirement to select one subnet per Availability Zone for each transit gateway VPC attachment. I added inline comments to make that constraint explicit.
- The summary overstated the custom route table workflow by mentioning only `aws_ec2_transit_gateway_route_table`. I updated it to include explicit attachment association and TGW routes, which are required for the example shown.

## Review Notes
- The post keeps default route table propagation enabled on the transit gateway and uses a custom association only for `vpc_a`. That is technically valid for this example, but stricter isolation patterns usually manage propagation explicitly for each participating attachment as well.
