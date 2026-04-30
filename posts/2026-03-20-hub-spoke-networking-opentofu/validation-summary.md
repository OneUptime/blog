# Validation Summary: How to Build Hub-and-Spoke Networking with OpenTofu

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- OpenTofu
- HCL
- AWS Transit Gateway
- AWS VPC routing
- Google Cloud Shared VPC

## Sources Consulted
- AWS Transit Gateway route tables: https://docs.aws.amazon.com/en_us/vpc/latest/tgw/tgw-route-tables.html
- How AWS Transit Gateway works: https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-isolated.html
- AWS centralized egress guidance: https://docs.aws.amazon.com/en_us/prescriptive-guidance/latest/transitioning-to-multiple-aws-accounts/centralized-egress.html
- Terraform Registry - `aws_ec2_transit_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway
- Terraform Registry - `aws_ec2_transit_gateway_vpc_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment
- Terraform Registry - `aws_ec2_transit_gateway_route_table_association`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_association
- Terraform Registry - `aws_ec2_transit_gateway_route_table_propagation`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_propagation
- Terraform Registry - `aws_ec2_transit_gateway_route`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route
- Terraform Registry - `aws_route`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- Google Cloud Shared VPC overview: https://cloud.google.com/vpc/docs/shared-vpc
- Google Cloud Shared VPC provisioning: https://cloud.google.com/vpc/docs/provisioning-shared-vpc
- Terraform Registry - `google_compute_shared_vpc_host_project`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_shared_vpc_host_project
- Terraform Registry - `google_compute_shared_vpc_service_project`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_shared_vpc_service_project

## Issues Found
- The AWS Transit Gateway example enabled default route table association and propagation while also managing custom associations and propagations. I changed the Transit Gateway defaults to `disable`, disabled default association and propagation on the attachment resources, and added an explicit hub attachment association so the route-domain segmentation described by the post matches AWS Transit Gateway behavior.
- The AWS centralized egress example routed `0.0.0.0/0` from the spoke VPC route tables to the Transit Gateway, but it did not add a matching static `0.0.0.0/0` route in the spoke Transit Gateway route table. I added `aws_ec2_transit_gateway_route.spoke_default_to_hub`, which is required for centralized egress through the hub attachment.
- The GCP text described Shared VPC as the same pattern as AWS hub-and-spoke. I revised the wording to describe it more accurately as centralized networking across projects, and added a prerequisite note about Shared VPC Admin permissions and the Compute Engine API.

## Review Notes
- The AWS snippets are partial examples and still assume the surrounding subnet and route table resources already exist, such as `aws_subnet.hub_transit`, `aws_subnet.spoke_transit`, and `aws_route_table.spoke_private`.
- For a fully working centralized egress design, the hub VPC also needs the corresponding return routes plus NAT gateway and internet gateway routing inside the hub VPC. The post now notes this requirement, but it does not expand the full egress-VPC routing setup in code.
