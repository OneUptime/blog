# Validation Summary: How to Create Transit Gateways with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Transit Gateway
- Amazon VPC routing
- AWS Resource Access Manager
- Amazon CloudWatch
- Terraform
- HashiCorp AWS Provider

## Sources Consulted
- AWS Transit Gateway: What is AWS Transit Gateway for Amazon VPC? https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
- AWS Transit Gateway: How AWS Transit Gateway works https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- AWS Transit Gateway: Amazon VPC attachments https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- Amazon VPC: Routing for a transit gateway https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html#route-tables-tgw
- AWS Transit Gateway CloudWatch metrics https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-cloudwatch-metrics.html
- AWS Transit Gateway pricing https://aws.amazon.com/transit-gateway/pricing/
- AWS Resource Access Manager User Guide: Sharing your AWS resources https://docs.aws.amazon.com/ram/latest/userguide/getting-started-sharing.html
- Terraform Registry: aws_ec2_transit_gateway https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway
- Terraform Registry: aws_ec2_transit_gateway_vpc_attachment https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment
- Terraform Registry: aws_ec2_transit_gateway_route_table_association https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_association
- Terraform Registry: aws_ec2_transit_gateway_route_table_propagation https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_propagation
- Terraform Registry: aws_ec2_transit_gateway_route https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route
- Terraform Registry: aws_ram_resource_share https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ram_resource_share

## Issues Found
- The Transit Gateway creation section said `auto_accept_shared_attachments` enabled auto-accept for attachments within the same account. This setting applies to shared attachment requests, so the wording was corrected.
- The VPC attachment section said the attachment specifies which subnets should have routes to the Transit Gateway. AWS documentation describes these subnets as the Availability Zone entry and exit points for Transit Gateway traffic; VPC subnet route tables are configured separately. The sentence was corrected.
- The custom route table example used explicit Transit Gateway route table associations and propagations after earlier examples left default association and propagation enabled. The Terraform AWS Provider warns not to manage the same association or propagation in both places. A short note was added explaining that default association/propagation should be disabled when managing them explicitly.
- The RAM example comment said `allow_external_principals = true` is required for cross-account sharing. It is specifically required for principals outside the AWS Organization, so the comment was corrected.

## Review Notes
The Terraform resource names and arguments used in the examples are current in the HashiCorp AWS Provider documentation. The pricing note is region-dependent; the cited `$0.05/hour` attachment rate matches the AWS Transit Gateway pricing example for US East (Ohio), but readers should still check their target region.
