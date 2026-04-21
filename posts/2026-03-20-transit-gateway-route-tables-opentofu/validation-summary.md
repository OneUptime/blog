# Validation Summary: How to Set Up Transit Gateway Route Tables with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- AWS Transit Gateway
- AWS Transit Gateway route tables
- AWS Transit Gateway VPC attachments
- AWS VPN / Direct Connect gateway attachments
- HashiCorp AWS provider resources

## Sources Consulted
- AWS Transit Gateway route tables documentation: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html
- AWS Transit Gateway routing and VPC route table behavior: https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- HashiCorp AWS provider `aws_ec2_transit_gateway` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway.html.markdown
- HashiCorp AWS provider `aws_ec2_transit_gateway_vpc_attachment` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway_vpc_attachment.html.markdown
- HashiCorp AWS provider `aws_ec2_transit_gateway_route_table` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway_route_table.html.markdown
- HashiCorp AWS provider `aws_ec2_transit_gateway_route_table_association` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway_route_table_association.html.markdown
- HashiCorp AWS provider `aws_ec2_transit_gateway_route_table_propagation` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway_route_table_propagation.html.markdown
- HashiCorp AWS provider `aws_ec2_transit_gateway_route` documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway_route.html.markdown
- OpenTofu CLI command documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu `plan` command documentation: https://opentofu.org/docs/cli/commands/plan/

## Issues Found
- The prerequisites incorrectly said that an existing Transit Gateway and VPC attachments were required, while the tutorial creates the Transit Gateway and VPC attachments. Updated the prerequisites to require existing VPCs, subnet IDs, VPC subnet route table routes for end-to-end traffic, and an on-premises attachment ID only when using the static route example.
- The VPC attachment examples did not explicitly disable default Transit Gateway route table association and propagation on the attachments. Added `transit_gateway_default_route_table_association = false` and `transit_gateway_default_route_table_propagation = false` to align the snippets with the guide's explicit route table association and propagation resources.
- The static route example used `var.vpn_attachment_id` while the text said the route could target a VPN or Direct Connect gateway attachment. Renamed the example input to `var.onprem_attachment_id` and clarified the Direct Connect gateway wording.

## Review Notes
The resource names, required arguments, and `tofu init`, `tofu plan`, and `tofu apply` commands match the current official documentation. AWS Transit Gateway route table associations and propagations are accurately described: each attachment is associated with one route table for lookup, and attachments can propagate routes to one or more route tables. End-to-end connectivity also depends on VPC subnet route table entries and normal security controls, which are outside the route-table-focused snippets.
