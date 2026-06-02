# Validation Summary: How to Share Transit Gateway Across AWS Accounts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Transit Gateway
- AWS Resource Access Manager (AWS RAM)
- AWS Organizations
- AWS CLI
- AWS CloudFormation
- Amazon CloudWatch
- Amazon VPC route tables

## Sources Consulted
- AWS Transit Gateway shared transit gateways: https://docs.aws.amazon.com/vpc/latest/tgw/working-with-transit-gateways.html
- AWS Transit Gateway overview: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-transit-gateways.html
- AWS Transit Gateway VPC attachments: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- AWS Transit Gateway route tables: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html
- AWS Transit Gateway CloudWatch metrics: https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-cloudwatch-metrics.html
- AWS RAM sharing resources: https://docs.aws.amazon.com/ram/latest/userguide/getting-started-sharing.html
- AWS RAM using shared resources: https://docs.aws.amazon.com/ram/latest/userguide/getting-started-shared.html
- AWS RAM shareable resources: https://docs.aws.amazon.com/ram/latest/userguide/shareable.html
- AWS CLI create-transit-gateway-vpc-attachment: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-transit-gateway-vpc-attachment.html
- AWS CLI accept-transit-gateway-vpc-attachment: https://docs.aws.amazon.com/cli/latest/reference/ec2/accept-transit-gateway-vpc-attachment.html
- AWS CloudFormation AWS::RAM::ResourceShare: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ram-resourceshare.html
- AWS CloudFormation AWS::EC2::TransitGateway: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-transitgateway.html
- AWS CloudFormation AWS::EC2::TransitGatewayVpcAttachment: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-transitgatewayvpcattachment.html

## Issues Found
- The prerequisites implied AWS Organizations sharing was always required. Updated the wording to make clear it is required for Organization or OU shares, while individual account sharing can work without it.
- The share acceptance section said all account-ID shares require manual acceptance. Updated it to reflect AWS RAM behavior: invitations are not used for principals in an enabled AWS Organization, including individual accounts in that Organization.
- The transit gateway route propagation example used undefined `$ATTACH_SHARED` and `$RT_SHARED` variables. Updated the example to propagate between `$ATTACH_PROD`, `$ATTACH_DEV`, `$RT_PROD`, and `$RT_DEV`, which are consistent with the post's earlier examples.
- The CloudFormation networking-account example referenced `OrganizationArn` without declaring it. Added a `Parameters` entry for `OrganizationArn`.
- The CloudWatch example claimed to check bytes per attachment but only filtered by `TransitGateway`. Added the `TransitGatewayAttachment` dimension so the metric query matches AWS Transit Gateway attachment-level metrics.

## Review Notes
- The AWS CLI command structure, CloudFormation resource/property names, Transit Gateway attachment flow, auto-accept behavior, centralized route table management guidance, and referenced OneUptime links were otherwise technically valid.
- The examples use placeholder IDs and broad summary routes such as `10.0.0.0/8`; those are acceptable for a tutorial but should be adapted to real account IDs, Regions, subnets, route tables, and CIDR plans before deployment.
