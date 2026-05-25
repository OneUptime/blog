# Validation Summary: How to Build a Hub-and-Spoke Network with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Transit Gateway
- Amazon VPC
- AWS NAT Gateway
- AWS Network Firewall
- AWS route tables and subnet associations

## Sources Consulted
- AWS Transit Gateway documentation: https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
- AWS Transit Gateway centralized routing and NAT egress examples: https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- AWS NAT Gateway use cases: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html
- Terraform AWS provider `aws_ec2_transit_gateway`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ec2_transit_gateway.html.markdown
- Terraform AWS provider `aws_ec2_transit_gateway_vpc_attachment`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ec2_transit_gateway_vpc_attachment.html.markdown
- Terraform AWS provider `aws_ec2_transit_gateway_route_table_association`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ec2_transit_gateway_route_table_association.html.markdown
- Terraform AWS provider `aws_ec2_transit_gateway_route_table_propagation`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ec2_transit_gateway_route_table_propagation.html.markdown
- Terraform AWS provider `aws_ec2_transit_gateway_route`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ec2_transit_gateway_route.html.markdown
- Terraform AWS provider `aws_nat_gateway`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/nat_gateway.html.markdown
- Terraform AWS provider `aws_networkfirewall_firewall`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/networkfirewall_firewall.html.markdown
- Terraform `cidrsubnet` function documentation: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet

## Issues Found
- The hub VPC snippet described public, private, and Transit Gateway attachment subnets, but did not include route tables, subnet associations, or an internet gateway. Added the missing Terraform resources so the subnet roles described in the post are actually represented.
- The spoke module routed traffic through `aws_route_table.private.id`, but that route table and its subnet associations were not defined. Added the private route table and associations.
- The centralized NAT Gateway snippet referenced `aws_eip.nat` without defining it and did not declare the recommended dependency on the internet gateway. Added the Elastic IP resource and explicit NAT Gateway dependency.
- The centralized egress routing was incomplete. AWS's centralized NAT example requires spoke traffic to enter the NAT VPC through private Transit Gateway attachment subnets, route to the NAT Gateway, and route return traffic from NAT public subnets back to spoke CIDRs through the Transit Gateway. Updated the snippet accordingly.
- The Network Firewall section implied that creating the firewall alone makes it the inspection point. Updated the explanation to state that route-table updates are required and that appliance mode should be enabled on the hub Transit Gateway attachment when symmetric stateful inspection is needed.

## Review Notes
The corrected snippets are still illustrative and assume variables such as `var.availability_zones`, `var.spoke_attachments`, and `var.spoke_cidrs` are defined elsewhere. For a production-ready module, add complete variable definitions, outputs from the spoke modules, firewall endpoint routing, and validation to keep VPC CIDR blocks non-overlapping.
