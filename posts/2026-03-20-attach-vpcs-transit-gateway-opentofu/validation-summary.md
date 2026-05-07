# Validation Summary: How to Attach VPCs to Transit Gateway with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Transit Gateway
- Amazon VPC
- AWS Resource Access Manager (RAM)
- AWS provider for Terraform/OpenTofu
- VPC and Transit Gateway route tables

## Sources Consulted
- AWS Transit Gateway VPC attachments — https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- AWS Transit Gateway shared attachment acceptance — https://docs.aws.amazon.com/vpc/latest/tgw/acccept-tgw-attach.html
- AWS Transit Gateway design best practices — https://docs.aws.amazon.com/vpc/latest/tgw/tgw-best-design-practices.html
- Working with AWS Transit Gateway — https://docs.aws.amazon.com/vpc/latest/tgw/working-with-transit-gateways.html
- AWS Resource Access Manager getting started — https://docs.aws.amazon.com/ram/latest/userguide/getting-started.html
- AWS provider: `aws_ec2_transit_gateway` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway
- AWS provider: `aws_ec2_transit_gateway_vpc_attachment` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment
- AWS provider: `aws_ec2_transit_gateway_vpc_attachment_accepter` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment_accepter
- AWS provider: `aws_ec2_transit_gateway_route` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route
- AWS provider: `aws_ec2_transit_gateway_route_table_association` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_association
- AWS provider: `aws_ec2_transit_gateway_route_table_propagation` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_propagation
- AWS provider: `aws_route` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- AWS provider: `aws_ram_resource_share` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ram_resource_share
- AWS provider: `aws_ram_principal_association` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ram_principal_association

## Issues Found

1. **The introduction overstated the role of RAM.** It implied both same-account and cross-account attachments are managed "using Resource Access Manager." Same-account VPC attachments are created directly; RAM is only part of the cross-account sharing flow. Updated the opening explanation to reflect that distinction.

2. **The cross-account example mixed a separate-configuration explanation with a direct in-configuration resource reference.** The original text said the spoke attachment is typically created in a separate configuration, but the accepter resource directly referenced that attachment resource. That pattern is not valid across separate states without an explicit handoff. Updated the example to a single OpenTofu configuration with aliased providers for the TGW owner and spoke accounts, which matches the supported provider pattern.

3. **The cross-account attachment managed default route table settings from the requester side.** For RAM-shared transit gateways, the AWS provider documents that `transit_gateway_default_route_table_association` and `transit_gateway_default_route_table_propagation` cannot be configured on the requester-side `aws_ec2_transit_gateway_vpc_attachment` resource. Removed those arguments from the spoke attachment and kept owner-side control on the accepter resource instead.

4. **The cross-account flow omitted an important sequencing requirement.** The attachment should be created only after the RAM share is in place, and environments without RAM sharing enabled in AWS Organizations may require accepting the resource share first. Added the dependency and a note about accepting the RAM share when needed.

5. **The VPC route table example was one-sided for the traffic pattern described.** The original snippet only routed spoke VPC traffic to shared services, but the post also described shared services responding back to the spoke VPCs. Added shared-services return routes so the example is bidirectional.

6. **One best-practices bullet was technically incorrect about cross-account acceptance, and another used the wrong parameter name.** Updated the text to clarify that RAM shares the transit gateway but does not remove the need for attachment acceptance unless `auto_accept_shared_attachments` is enabled, and corrected the route propagation parameter name to `transit_gateway_default_route_table_propagation`.

## Review Notes
- The examples assume non-overlapping VPC CIDR ranges. AWS Transit Gateway does not propagate routes for overlapping VPC CIDRs.
- `dns_support = "enable"` on a VPC attachment does not provide private Route 53 hosted zone resolution across attached VPCs by itself. AWS documents additional DNS architecture requirements for that use case.
