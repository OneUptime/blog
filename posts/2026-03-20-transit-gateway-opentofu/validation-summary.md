# Validation Summary: How to Configure AWS Transit Gateway with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Transit Gateway
- AWS VPC routing
- AWS Site-to-Site VPN
- AWS Resource Access Manager
- AWS provider resources for OpenTofu/Terraform

## Sources Consulted
- AWS provider documentation: `aws_ec2_transit_gateway` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway
- AWS provider documentation: `aws_ec2_transit_gateway_vpc_attachment` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment
- AWS provider documentation: `aws_ec2_transit_gateway_route_table` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table
- AWS provider documentation: `aws_ec2_transit_gateway_route_table_association` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_association
- AWS provider documentation: `aws_ec2_transit_gateway_route_table_propagation` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_propagation
- AWS provider documentation: `aws_vpn_connection` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection
- AWS provider documentation: `aws_route` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- AWS provider documentation: `aws_ram_resource_share` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ram_resource_share
- AWS provider documentation: `aws_ram_resource_association` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ram_resource_association
- AWS provider documentation: `aws_ram_principal_association` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ram_principal_association
- AWS Transit Gateway documentation: How AWS Transit Gateway works - https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- OpenTofu language documentation: `for_each` meta-argument - https://opentofu.org/docs/language/meta-arguments/for_each/
- OpenTofu language documentation: splat expressions - https://opentofu.org/docs/language/expressions/splat/

## Issues Found
- The VPN route table association referenced `aws_vpn_connection.on_prem.transit_gateway_attachments`, but the current AWS provider exposes the Transit Gateway VPN attachment ID as `transit_gateway_attachment_id`. Updated the snippet to use `aws_vpn_connection.on_prem.transit_gateway_attachment_id`.
- The route table section described the shared services route table as the table that lets all VPCs reach shared services. In the shown configuration, the shared services attachment is associated with that table and app routes are propagated into it, so it controls shared-services-to-app routing. Updated the comment to reflect that direction.
- The VPC route example described `10.0.0.0/8` as "all RFC1918" and "all traffic." RFC1918 also includes `172.16.0.0/12` and `192.168.0.0/16`, and `10.0.0.0/8` is not all traffic. Updated the wording to "private 10/8 traffic."

## Review Notes
The remaining examples use current AWS provider resource names and argument names. For a production VPN design, route table association and propagation should be planned around exactly which VPC CIDRs are advertised to the customer gateway and which on-premises prefixes are propagated back into each Transit Gateway route table.
