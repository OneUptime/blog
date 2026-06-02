# Validation Summary: How to Set Up a Three-Tier VPC Architecture

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC
- AWS CloudFormation
- VPC subnets and CIDR planning
- Internet gateways
- NAT gateways
- Route tables
- Security groups
- VPC gateway endpoints for Amazon S3 and DynamoDB

## Sources Consulted
- AWS CloudFormation Template Reference: AWS::EC2::VPC - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpc.html
- AWS CloudFormation Template Reference: AWS::EC2::Subnet - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnet.html
- AWS CloudFormation Template Reference: AWS::EC2::NatGateway - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-natgateway.html
- AWS CloudFormation Template Reference: AWS::EC2::Route - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-route.html
- AWS CloudFormation Template Reference: AWS::EC2::SubnetRouteTableAssociation - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnetroutetableassociation.html
- AWS CloudFormation Template Reference: AWS::EC2::SecurityGroup - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-securitygroup.html
- Amazon VPC User Guide: Enable internet access for a VPC using an internet gateway - https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- Amazon VPC User Guide: Configure route tables - https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html
- Amazon VPC User Guide: Pricing for NAT gateways - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- Amazon VPC User Guide: Gateway endpoints - https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- Amazon VPC Pricing - https://aws.amazon.com/vpc/pricing/

## Issues Found
- The security group snippet comment said the web tier accepted public traffic on both 80 and 443, but the CloudFormation rule only opened TCP 443 and the surrounding explanation described HTTPS-only access. Updated the comment to say the web tier accepts public traffic on 443.

## Review Notes
- The CloudFormation resource types and property names used in the VPC, subnet, internet gateway, NAT gateway, route table, route, route table association, and security group snippets match the current AWS CloudFormation documentation.
- The route-table explanation is accurate: public subnets require an internet gateway route, private app subnets can route outbound IPv4 traffic through NAT gateways, and isolated data subnets without a default route do not have internet egress through the shown configuration.
- AWS documentation confirms NAT gateways are billed per hour and per gigabyte processed; the post's approximate monthly cost is reasonable for a 730-hour month in regions where NAT gateway pricing is $0.045 per hour.
- AWS documentation confirms gateway endpoints for S3 and DynamoDB have no additional charge and can avoid NAT gateway usage for those services.
- The referenced OneUptime links returned HTTP 200 during validation.
