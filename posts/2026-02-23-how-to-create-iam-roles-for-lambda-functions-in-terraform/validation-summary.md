# Validation Summary: How to Create IAM Roles for Lambda Functions in Terraform

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (HCL)
- AWS IAM (Identity and Access Management)
- AWS Lambda
- AWS managed policies (`AWSLambdaBasicExecutionRole`, `AWSLambdaVPCAccessExecutionRole`)
- AWS S3, DynamoDB, SQS, SNS, Secrets Manager, KMS (IAM action references)
- AWS VPC (for Lambda VPC access / ENIs)
- Terraform AWS provider data sources (`aws_iam_policy_document`, `aws_caller_identity`, `aws_region`)

## Sources Consulted
- Terraform AWS Provider documentation:
  - `aws_iam_role`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role
  - `aws_iam_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
  - `aws_iam_role_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
  - `aws_iam_role_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy
  - `aws_iam_policy_document` (data source): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/iam_policy_document
  - `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
  - `aws_caller_identity`, `aws_region` data sources
- AWS Lambda Execution Role documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS Lambda VPC documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Managed Policy references for `AWSLambdaBasicExecutionRole` and `AWSLambdaVPCAccessExecutionRole`
- AWS Lambda runtime support policy: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- IAM JSON policy reference (Version `2012-10-17`)
- IAM action references for S3, DynamoDB, SQS, SNS, KMS, Secrets Manager

## Issues Found
- **Deprecated Lambda runtime (`nodejs18.x`)**: The Basic Lambda Execution Role example used `runtime = "nodejs18.x"`. Node.js 18 has entered the AWS Lambda runtime deprecation phases (reaching end of standard support during 2025), so using it as a default in a new tutorial would lead readers to a runtime that may block new function creation or updates. Updated to `nodejs20.x`, which is a current LTS runtime fully supported by Lambda.

## Review Notes
- Attaching both `AWSLambdaBasicExecutionRole` and `AWSLambdaVPCAccessExecutionRole` (in the VPC and module examples) is technically correct but slightly redundant: `AWSLambdaVPCAccessExecutionRole` already grants the CloudWatch Logs permissions included in `AWSLambdaBasicExecutionRole`. AWS docs explicitly state that the VPC policy includes the logging permissions, so the basic policy could be omitted when the VPC policy is attached. Left as-is because this is an intentional, defensive style and not technically wrong.
- The `aws_region.current.name` attribute used in the DynamoDB example is correct for the current AWS provider. The provider also exposes `region` aliases in newer versions, but `name` continues to work and is the canonical, documented attribute.
- The Python runtime `python3.11` is still supported by AWS Lambda as of the validation date; no change needed.
- The post uses example subnet/security group IDs (`subnet-abc123`, `sg-12345678`) which are clearly placeholders; this is acceptable for an illustrative example.
- The DynamoDB ARN structure (`table/<name>` and `table/<name>/index/*`) is correctly scoped to include GSIs and LSIs.
- The KMS resource ARN uses `key/*` (account-wide wildcard); the post's own "Best Practices" section recommends tightening such wildcards, which is consistent with general guidance.
