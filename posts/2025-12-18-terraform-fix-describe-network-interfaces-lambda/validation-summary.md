# Validation Summary: How to Fix 'DescribeNetworkInterfaces' Permission Errors in Lambda

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- AWS Lambda
- Amazon VPC
- Elastic Network Interfaces (ENIs)
- AWS IAM managed and inline policies
- Terraform AWS provider
- terraform-aws-modules/lambda/aws
- AWS CLI Service Quotas
- Node.js Lambda runtime

## Sources Consulted
- AWS Lambda documentation: Giving Lambda functions access to resources in an Amazon VPC: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Managed Policy Reference: AWSLambdaVPCAccessExecutionRole: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaVPCAccessExecutionRole.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS IAM Service Authorization Reference for Amazon EC2 actions/resources/condition keys: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS CLI Command Reference for `service-quotas get-service-quota`: https://docs.aws.amazon.com/cli/latest/reference/service-quotas/get-service-quota.html
- AWS documentation referencing VPC ENI quota code `L-DF5E4CA3`: https://docs.aws.amazon.com/sagemaker/latest/dg/sagemaker-hyperpod-prerequisites.html
- HashiCorp AWS provider `aws_region` data source documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/region.html.markdown
- terraform-aws-modules/lambda variable definitions for `attach_network_policy`: https://raw.githubusercontent.com/terraform-aws-modules/terraform-aws-lambda/master/variables.tf

## Issues Found
- The post stated that the Lambda execution role needs `ec2:DescribeVpcs` and `ec2:DescribeSecurityGroups`. AWS documents those as permissions needed by the IAM principal creating or updating the function, while the Lambda execution role requires the VPC ENI actions and `ec2:DescribeSubnets`. I moved those describe actions into a separate deployment-principal note and added `ec2:GetSecurityGroupsForVpc`.
- The custom "minimal permissions" policy included extra VPC/security-group describe actions that are not part of AWS's documented Lambda execution-role VPC policy. I removed them from that custom policy.
- The restrictive policy applied `ec2:Vpc` conditions and resource scoping to `ec2:DescribeNetworkInterfaces`, which is a describe/list action that should remain on all resources. I moved describe actions into an all-resources statement and kept resource constraints only for network-interface management actions that support them.
- The examples used `nodejs18.x`, which AWS lists as a deprecated runtime as of the validation date. I updated the examples to `nodejs24.x`.
- The Terraform examples used `data.aws_region.current.name`, which the current Terraform AWS provider documentation marks as deprecated. I updated examples to use `data.aws_region.current.region`.
- The "complete" Terraform example referenced `data.aws_region.current` without defining it. I added the missing `data "aws_region" "current" {}` declaration.
- The post claimed each Lambda function creates ENIs. AWS Lambda now creates and reuses Hyperplane ENIs for subnet/security group combinations and scales ENIs based on need. I corrected the explanation and ENI quota note.
- The post implied `AWSLambdaBasicExecutionRole` is required alongside `AWSLambdaVPCAccessExecutionRole` for logging. The VPC managed policy already includes CloudWatch Logs permissions, so I marked the basic policy attachment as optional/redundant in the example.

## Review Notes
- Terraform and AWS CLI binaries were not installed in the local environment, so I could not run `terraform validate` or `aws --help`; CLI syntax and Terraform fields were checked against official documentation instead.
- The NAT Gateway snippet is illustrative and references `aws_subnet.public`, which is not defined in the earlier complete example. This is acceptable for a pitfall snippet, but a future improvement could make that standalone.
