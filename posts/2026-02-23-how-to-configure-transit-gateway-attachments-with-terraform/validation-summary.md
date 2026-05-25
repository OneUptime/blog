# Validation Summary: How to Configure Transit Gateway Attachments with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- AWS Transit Gateway
- AWS VPC routing
- AWS Resource Access Manager
- Amazon CloudWatch metrics

## Sources Consulted
- Terraform AWS provider: aws_ec2_transit_gateway - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway
- Terraform AWS provider: aws_ec2_transit_gateway_vpc_attachment - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment
- Terraform AWS provider: aws_ec2_transit_gateway_route_table_association - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_association
- Terraform AWS provider: aws_ec2_transit_gateway_route_table_propagation - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table_propagation
- Terraform AWS provider: aws_ec2_transit_gateway_route - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route
- Terraform AWS provider: aws_route_table and aws_route_table_association - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- Terraform AWS provider: AWS RAM resources - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ram_resource_share
- AWS Transit Gateway documentation - https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
- AWS Transit Gateway VPC attachment documentation - https://docs.aws.amazon.com/vpc/latest/tgw/create-vpc-attachment.html
- AWS Transit Gateway CloudWatch metrics - https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-cloudwatch-metrics.html

## Issues Found
- The comment for `auto_accept_shared_attachments` incorrectly described same-account attachments. I changed it to describe cross-account attachments to a shared Transit Gateway, matching the Terraform AWS provider behavior.
- The app VPC attachment was later associated with a custom Transit Gateway route table, but the attachment still used the default route-table association. Terraform documentation warns that the same association should not be managed by both the attachment resource and `aws_ec2_transit_gateway_route_table_association`. I added `transit_gateway_default_route_table_association = false` to the app attachment.
- The VPC route-table example created route tables but did not associate them with any subnets, so the routes would not affect traffic from the example subnets. I added `aws_route_table_association` resources for the app and database subnets.
- The shared services VPC attachment was part of the topology, but the VPC route-table example did not add reciprocal routes or subnet associations for that VPC. I added a shared services route table with routes to the app and database VPC CIDRs and associated it with the shared subnets.
- The monitoring text implied CloudWatch metrics directly track attachment status. AWS Transit Gateway CloudWatch metrics cover traffic and drop counters, while attachment state is exposed as attachment state information. I revised the sentence to distinguish metrics from attachment status.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform fmt` or `terraform validate`. The HCL resource and argument names were checked against the official Terraform AWS provider documentation.
