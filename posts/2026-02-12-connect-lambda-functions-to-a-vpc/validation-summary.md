# Validation Summary: How to Connect Lambda Functions to a VPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- Amazon VPC
- AWS IAM
- AWS CloudFormation
- AWS CLI
- Amazon EC2 security groups and ENIs
- NAT Gateway
- VPC endpoints
- AWS Provisioned Concurrency

## Sources Consulted
- AWS Lambda Developer Guide: Giving Lambda functions access to resources in an Amazon VPC - https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Lambda Developer Guide: Enable internet access for VPC-connected Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html
- AWS Lambda Developer Guide: Troubleshoot networking issues in Lambda - https://docs.aws.amazon.com/lambda/latest/dg/troubleshooting-networking.html
- AWS Lambda Developer Guide: Configuring provisioned concurrency - https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- AWS Managed Policy Reference: AWSLambdaVPCAccessExecutionRole - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaVPCAccessExecutionRole.html
- AWS CloudFormation Reference: AWS::Lambda::Function VpcConfig - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-properties-lambda-function-vpcconfig.html
- AWS CloudFormation Reference: AWS::EC2::VPCEndpoint - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpcendpoint.html
- Amazon VPC User Guide: Gateway endpoints - https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- Amazon VPC User Guide: Gateway endpoints for Amazon S3 - https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html
- AWS CLI Command Reference: lambda update-function-configuration - https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- AWS CLI Command Reference: ec2 describe-network-interfaces - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-interfaces.html

## Issues Found
- The IAM section named `AmazonVPCFullAccess` as the managed policy for Lambda VPC access. Changed it to `AWSLambdaVPCAccessExecutionRole`, which is the AWS managed policy intended for Lambda functions accessing VPC resources.
- The minimal IAM policy omitted `ec2:DescribeSubnets`. Added it because AWS lists it as one of the required execution-role permissions for Lambda VPC attachment.
- The CloudFormation security group egress example used `CidrIpBlock`, which is not a valid `AWS::EC2::SecurityGroup` egress property. Changed both entries to `CidrIp`.
- The post described Lambda as running "within" or "inside" the customer VPC. Adjusted that wording to "attach" or "attached to" the VPC, matching AWS's model where Lambda still runs in a Lambda-managed VPC while using customer VPC networking for access.
- The internet access section implied VPC attachment categorically removes all external access. Clarified that outbound traffic goes through the configured VPC, so internet or AWS service access requires the appropriate routes, NAT, or endpoints.
- The cold-start section asserted a fixed 1-2 seconds of extra latency. Replaced that with a measured-performance caveat because AWS documents the Hyperplane ENI improvement but does not guarantee a fixed additional cold-start duration.
- The Provisioned Concurrency link pointed to an unrelated OneUptime canary deployment article. Updated it to the official AWS Lambda Provisioned Concurrency documentation.
- The ENI monitoring section incorrectly said each Lambda execution environment uses an ENI and described the limit as per-region. Updated it to reflect Hyperplane ENIs for subnet/security-group combinations and the documented per-VPC ENI quota behavior.
- The ENI counting command filtered on `requester-id` with a wildcard value. Changed it to the documented `interface-type=lambda` filter for Lambda-created ENIs.

## Review Notes
The NAT Gateway monthly cost is region-dependent and approximate, but the stated rough value is plausible for common US regions before data processing charges. The CloudFormation examples are partial snippets and assume referenced resources such as the VPC, subnets, role, and route table are defined elsewhere.
