# Validation Summary: How to Set Up VPC Gateway Endpoints for S3 and DynamoDB

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC gateway endpoints
- Amazon S3
- Amazon DynamoDB
- AWS CLI
- AWS CloudFormation
- IAM and S3 bucket policies
- NAT Gateway and VPC routing
- Amazon CloudWatch NAT Gateway metrics

## Sources Consulted
- AWS PrivateLink documentation: Gateway endpoints - https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- AWS PrivateLink documentation: Gateway endpoints for Amazon S3 - https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html
- AWS PrivateLink documentation: Gateway endpoints for Amazon DynamoDB - https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-ddb.html
- AWS PrivateLink documentation: Control access to VPC endpoints using endpoint policies - https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-access.html
- AWS CLI Command Reference: create-vpc-endpoint - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CloudFormation Template Reference: AWS::EC2::VPCEndpoint - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpcendpoint.html
- Amazon VPC pricing: NAT Gateway pricing and gateway endpoint cost note - https://aws.amazon.com/vpc/pricing/

## Issues Found
- The opening paragraph implied that every private subnet call to S3 or DynamoDB always goes through a NAT gateway. This is only true in a common private subnet setup without a gateway endpoint and with NAT routing configured. Updated the wording to say traffic typically goes through NAT when there is no gateway endpoint.
- The introduction said there are "no data processing charges" after using gateway endpoints. AWS documents that gateway endpoints have no additional hourly or data processing charge, but normal service charges and applicable transfer charges can still apply. Updated the wording to specifically refer to avoiding NAT gateway data processing charges for that traffic.
- The verification note said the S3 IP should resolve "to an address in the prefix list." DNS returns IP addresses, while the route table uses an AWS-managed prefix list that covers those addresses. Updated the wording to say the resolved address should be covered by the AWS-managed prefix list.

## Review Notes
The AWS CLI examples, endpoint policy examples, S3 bucket policy condition using `aws:sourceVpce`, CloudFormation `AWS::EC2::VPCEndpoint` resources, and same-region gateway endpoint caveats are consistent with official AWS documentation. The NAT Gateway cost example matches AWS's US East example pricing, but future posts should continue to label pricing as region-specific because rates can vary by region and may change over time.
