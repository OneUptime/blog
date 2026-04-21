# Validation Summary: How to Configure Route Tables for IPv4 Using Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS VPC route tables
- AWS Internet Gateway
- AWS NAT Gateway
- AWS VPC Peering
- AWS Transit Gateway

## Sources Consulted
- HashiCorp AWS Provider `aws_route` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- HashiCorp AWS Provider `aws_route_table` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table
- HashiCorp AWS Provider `aws_route_table_association` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route_table_association
- Terraform `count` meta-argument documentation: https://developer.hashicorp.com/terraform/language/meta-arguments/count
- Terraform splat expression documentation: https://developer.hashicorp.com/terraform/language/expressions/splat
- Terraform resource drift documentation: https://developer.hashicorp.com/terraform/tutorials/state/resource-drift
- AWS VPC route table documentation: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html
- AWS subnet route table documentation: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- AWS example routing options documentation: https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html
- AWS NAT gateway basics documentation: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html
- AWS VPC peering route table documentation: https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html
- Author GitHub profile link: https://github.com/nawazdhandala

## Issues Found
- The introduction claimed Terraform provides "full drift detection." This was too broad because Terraform detects drift for managed resources and the AWS provider documents cases where route table routes not modeled in Terraform can be ignored. Updated the sentence to say drift detection applies to resources defined in Terraform.
- The database route table example said database subnets are "completely isolated." AWS route tables always include an implicit local VPC route, so subnets with no internet route can still route within the VPC. Updated the comment to state that the table uses only the implicit local VPC route.
- The conclusion stated that AWS route tables in Terraform are managed as separate resources from routes and associations. The AWS provider also supports inline `route` blocks on `aws_route_table`, although they must not be mixed with standalone `aws_route` resources. Updated the wording to describe this as the pattern used in the post.

## Review Notes
The Terraform resource names and arguments shown in the snippets are current and valid for the AWS provider when the referenced VPC, subnet, internet gateway, NAT gateway, VPC peering, and transit gateway resources exist with matching counts. For future improvement, the VPC peering example could explicitly mention that the peer VPC needs a corresponding return route, and the transit gateway example routes only the first private route table.
