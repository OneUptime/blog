# Validation Summary: How to Configure Route Tables in a VPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC route tables
- AWS CLI for Amazon EC2/VPC
- Internet gateways
- NAT gateways
- VPC peering
- Transit gateways
- AWS CloudFormation

## Sources Consulted
- Amazon VPC User Guide: Subnet route tables - https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- Amazon VPC User Guide: Route priority - https://docs.aws.amazon.com/vpc/latest/userguide/route-tables-priority.html
- Amazon VPC User Guide: Manage subnet route tables - https://docs.aws.amazon.com/vpc/latest/userguide/WorkWithRouteTables.html
- Amazon VPC User Guide: NAT gateway basics - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html
- Amazon VPC User Guide: Regional NAT gateways - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateways-regional.html
- AWS CLI Command Reference: create-route - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI Command Reference: create-route-table - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route-table.html
- AWS CLI Command Reference: associate-route-table - https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-route-table.html
- AWS CLI Command Reference: describe-route-tables - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html
- AWS CloudFormation Template Reference: AWS::EC2::Route - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-route.html
- AWS CloudFormation Template Reference: AWS::EC2::RouteTable - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-routetable.html
- AWS CloudFormation Template Reference: AWS::EC2::SubnetRouteTableAssociation - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnetroutetableassociation.html
- AWS CloudFormation User Guide: DependsOn attribute - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-dependson.html

## Issues Found
- The post said the main route table always has a single local rule. AWS documents that route tables contain local routes for each VPC CIDR block, and main route tables can contain additional routes. Updated the wording to describe the default manually created VPC case.
- The post implied the local route alone means every VPC resource can reach every other resource. Updated the statement to note that security groups, network ACLs, and host firewalls must also allow the traffic.
- The longest-prefix-match example used a more-specific VPC peering route inside the VPC's own CIDR block. AWS only allows routes more specific than the local route for limited target types, not VPC peering. Changed the example to overlapping non-local routes where the more-specific route points to a transit gateway.
- The NAT gateway high-availability section referred to a "route table in AZ-b", which could imply route tables are Availability Zone scoped. It also overgeneralized the single-NAT-gateway failure mode now that AWS documents regional NAT gateways. Updated the wording to focus on zonal NAT gateways and private subnets in AZ-b using the NAT gateway in AZ-b.

## Review Notes
The AWS CLI is not installed in this workspace, so command syntax was verified against the official AWS CLI command reference rather than local `aws --help` output. The linked OneUptime article URL appears plausible, but it was not treated as an authoritative technical source for this validation.
