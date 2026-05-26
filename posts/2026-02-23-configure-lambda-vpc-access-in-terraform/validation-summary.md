# Validation Summary: How to Configure Lambda VPC Access in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Lambda
- Amazon VPC
- AWS IAM
- Amazon EC2 security groups
- NAT Gateway
- VPC endpoints / AWS PrivateLink
- Amazon S3 and DynamoDB gateway endpoints
- Secrets Manager and SQS interface endpoints

## Sources Consulted
- AWS Lambda Developer Guide: Giving Lambda functions access to resources in an Amazon VPC - https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Lambda Developer Guide: Enable internet access for VPC-connected Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html
- AWS Managed Policy Reference: AWSLambdaVPCAccessExecutionRole - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaVPCAccessExecutionRole.html
- Terraform AWS Provider: aws_lambda_function - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS Provider: aws_vpc_endpoint - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_endpoint
- Amazon VPC User Guide: Gateway endpoints - https://docs.aws.amazon.com/vpc/latest/privatelink/gateway-endpoints.html
- Amazon VPC User Guide: Gateway endpoints for Amazon S3 - https://docs.aws.amazon.com/vpc/latest/privatelink/vpc-endpoints-s3.html
- Amazon VPC User Guide: Subnet CIDR blocks - https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html
- AWS PrivateLink pricing - https://aws.amazon.com/privatelink/pricing/

## Issues Found
- The post said VPC-connected Lambda functions get an ENI in each specified subnet. Updated this to describe Lambda-managed Hyperplane ENIs for subnet and security group combinations, matching current AWS Lambda networking behavior.
- The post omitted `ec2:DescribeSubnets` from the `AWSLambdaVPCAccessExecutionRole` permission list. Added it to match the AWS managed policy document.
- The post said each concurrent Lambda execution uses an IP address and gave a one-IP-per-invocation capacity rule. Replaced this with current Hyperplane ENI behavior: ENIs are shared for subnet/security group combinations, support many connections, and Lambda can create additional ENIs as traffic and concurrency grow.
- The subnet sizing comment said a `/22` subnet has 1022 usable IPs. Corrected this to 1019 usable IPv4 addresses in AWS because AWS reserves five addresses in each subnet.
- The endpoint pricing language stated a fixed interface endpoint hourly price and implied endpoints are generally cheaper. Updated it to say gateway endpoints have no additional charge and interface endpoints have hourly per-AZ plus data processing charges, with cost depending on workload.

## Review Notes
The Terraform snippets use current resource names and arguments for the AWS provider examples reviewed. The snippets are partial examples and depend on external variables, data sources, public subnet routing, and existing resources that are not shown in the post.
