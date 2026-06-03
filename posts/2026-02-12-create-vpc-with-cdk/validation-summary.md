# Validation Summary: How to Create a VPC with CDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- Amazon VPC
- VPC subnets and NAT gateways
- VPC Flow Logs
- VPC endpoints
- Security groups
- Amazon RDS subnet placement
- Amazon ECS VPC usage

## Sources Consulted
- AWS CDK v2 EC2 construct library: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2-readme.html
- AWS CDK v2 Vpc API reference: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_ec2/Vpc.html
- AWS CDK v2 FlowLogDestination API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.FlowLogDestination.html
- AWS CDK v2 InterfaceVpcEndpointAwsService API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.InterfaceVpcEndpointAwsService.html
- Amazon ECR interface VPC endpoints documentation: https://docs.aws.amazon.com/AmazonECR/latest/userguide/vpc-endpoints.html
- Amazon VPC gateway endpoints documentation: https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html

## Issues Found
- The simple VPC example said CDK creates subnets across 3 AZs plus a NAT gateway. CDK's default is up to 3 AZs, but environment-agnostic stacks are limited to 2 AZs, and the default NAT gateway count is one per Availability Zone. Updated the comment and explanatory paragraph to reflect this.
- The production VPC example set `maxAzs: 3` without noting that CDK needs a specified stack account and region to use 3 or more AZs reliably. Added a short code comment with that caveat.

## Review Notes
The CDK v2 APIs used in the examples are current: `ec2.Vpc`, `IpAddresses.cidr`, `SubnetType.PRIVATE_WITH_EGRESS`, `addFlowLog`, `FlowLogDestination.toCloudWatchLogs`, `FlowLogDestination.toS3`, gateway and interface endpoint service constants, `Vpc.fromLookup`, `Vpc.fromVpcAttributes`, and subnet selection by type/name. The ECS endpoint guidance is broadly correct for private subnet image pulls and log delivery, though exact endpoint needs can vary by ECS launch type, Fargate platform version, registry type, and whether NAT remains available.
