# Validation Summary: How to Create a Shared Services VPC with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS VPC
- AWS subnets and route tables
- AWS Internet Gateway and NAT Gateway
- AWS Transit Gateway
- AWS security groups
- HashiCorp AWS Provider resources for OpenTofu/Terraform

## Sources Consulted
- OpenTofu CLI command documentation: https://opentofu.org/docs/cli/commands/
- OpenTofu `cidrsubnet` function documentation: https://opentofu.org/docs/language/functions/cidrsubnet/
- AWS VPC internet gateway documentation: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- AWS NAT gateway use cases and routing documentation: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html
- AWS Transit Gateway behavior documentation: https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- AWS Transit Gateway VPC attachments documentation: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- AWS provider `aws_availability_zones` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/availability_zones.html.markdown
- AWS provider `aws_nat_gateway` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/nat_gateway.html.markdown
- AWS provider `aws_route_table`, `aws_route`, and `aws_route_table_association` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route_table.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route_table_association.html.markdown
- AWS provider `aws_ec2_transit_gateway_vpc_attachment` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/ec2_transit_gateway_vpc_attachment.html.markdown
- AWS provider `aws_security_group` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/security_group.html.markdown

## Issues Found
- The prerequisites allowed "peering capability", but the tutorial only configures Transit Gateway networking. Changed the prerequisite to require an existing Transit Gateway ID, and clarified that an AWS Region must be configured.
- The subnet example referenced `data.aws_availability_zones.available` without declaring it. Added the `aws_availability_zones` data source and filtered out Local Zones so the example actually creates subnets across regular Availability Zones.
- The NAT gateway was placed in a subnet labeled public, but no route table sent public subnet traffic to the Internet Gateway. Added a public route table, a `0.0.0.0/0` route to the Internet Gateway, and public subnet associations.
- The NAT gateway resource did not explicitly depend on the Internet Gateway. Added `depends_on = [aws_internet_gateway.shared]`, matching the AWS provider's documented public NAT gateway example.
- The original private route table used an inline route while Step 5 used a standalone `aws_route` for the same configuration. The AWS provider warns against mixing inline `aws_route_table` routes with standalone `aws_route` resources, so the NAT route was converted to a standalone `aws_route`.
- The Transit Gateway example referenced `var.transit_gateway_id` without declaring it. Added a typed variable definition.
- The shared-services route to workload CIDRs could be created before the VPC attachment existed because it only referenced the Transit Gateway ID variable. Added an explicit dependency on the Transit Gateway VPC attachment.
- The Transit Gateway route comment and conclusion implied that workload VPCs would automatically be able to reach shared services. Updated the wording to state that workload VPC route tables and Transit Gateway route tables must also have corresponding routes.

## Review Notes
- The `aws_security_group` inline ingress and egress rules are still valid, but the current AWS provider documentation recommends the separate `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` resources for more complex rule management.
- The example uses one NAT gateway for private subnets in two Availability Zones. This is valid, but production deployments commonly use one NAT gateway per Availability Zone for better resiliency and to avoid cross-AZ routing.
- The `10.0.0.0/8` workload route assumes workload VPC CIDRs are in that range and do not overlap with one another. Real deployments should align this route with the organization's IP plan.
- Local `tofu validate` or `terraform validate` was not run because neither CLI is installed in this environment.
