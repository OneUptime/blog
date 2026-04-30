# Validation Summary: How to Build a Hub-Spoke Network Topology with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCL
- AWS Transit Gateway
- AWS VPC
- AWS VPC route tables
- Hub-spoke network topology
- AWS provider resources for Transit Gateway attachments and routes

## Sources Consulted
- OpenTofu documentation, `for_each` meta-argument: https://opentofu.org/docs/v1.11/language/meta-arguments/for_each/
- OpenTofu documentation, input variables: https://opentofu.org/docs/language/values/variables/
- AWS documentation, "Transit gateway route tables in AWS Transit Gateway": https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html
- AWS documentation, "Amazon VPC attachments in AWS Transit Gateway": https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- AWS documentation, "How AWS Transit Gateway works": https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- AWS documentation, "Example routing options" (`Routing for a transit gateway`): https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html
- AWS documentation, "AWS Transit Gateway design best practices": https://docs.aws.amazon.com/vpc/latest/tgw/tgw-best-design-practices.html
- Terraform Registry, AWS provider `aws_ec2_transit_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway
- Terraform Registry, AWS provider `aws_ec2_transit_gateway_vpc_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment
- Terraform Registry, AWS provider `aws_ec2_transit_gateway_route_table_propagation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_propagation

## Issues Found
- The TGW routing was incomplete. The original post propagated the hub attachment into the spoke route table, but it never propagated the spoke attachments into the hub route table. That meant the hub side would not learn spoke CIDRs through the TGW. I added `aws_ec2_transit_gateway_route_table_propagation.spokes_to_hub` so the hub route table actually receives spoke routes.
- The post omitted the VPC subnet route table entries that AWS requires for traffic to reach the transit gateway. TGW route tables alone are not enough. I added example `aws_route` resources for hub-to-spoke and spoke-to-hub routing.
- The comment `Spoke route table - default route to hub only` was technically inaccurate. The configuration was not creating a `0.0.0.0/0` default route; it was only propagating the hub VPC CIDR into the spoke TGW route table. I corrected that wording and tightened the spoke-isolation best-practice language to refer to the shared spoke route table precisely.
- The post disabled default TGW association and propagation at the transit gateway level, but left the VPC attachments implicit. I made the attachment resources explicitly set `transit_gateway_default_route_table_association = false` and `transit_gateway_default_route_table_propagation = false` so the manual route-table association and propagation pattern is explicit and consistent.

## Review Notes
- For high availability, AWS Transit Gateway attachments should use one subnet per Availability Zone that needs TGW connectivity. The spoke example remains a minimal single-subnet illustration.
- If the shared DNS service in the hub VPC is based on Route 53 private hosted zones, TGW alone does not provide cross-VPC private hosted-zone DNS resolution. AWS documents additional centralized DNS configuration for that pattern.
