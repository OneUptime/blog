# Validation Summary: How to Set Up Lambda with VPC Access Using OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Lambda
- Amazon VPC
- AWS IAM
- Amazon RDS
- Amazon ElastiCache
- HCL

## Sources Consulted
- AWS Lambda VPC configuration: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Lambda internet access for VPC-connected functions: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html
- AWSLambdaVPCAccessExecutionRole managed policy reference: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaVPCAccessExecutionRole.html
- AWS Lambda Python runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- AWS Lambda execution environment and cold starts: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtime-environment.html
- Amazon VPC security group rules: https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html
- OpenTofu `init`: https://opentofu.org/docs/cli/init/
- OpenTofu `plan`: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply`: https://opentofu.org/docs/cli/commands/apply/
- AWS provider `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS provider `aws_iam_role_policy_attachment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_role_policy_attachment
- AWS provider `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider `aws_security_group_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule
- AWS provider `aws_vpc_security_group_ingress_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule
- AWS provider `aws_vpc_security_group_egress_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule

## Issues Found
- The post used inline `egress` rules on `aws_security_group` together with `aws_security_group_rule` resources. Current AWS provider documentation recommends `aws_vpc_security_group_ingress_rule` and `aws_vpc_security_group_egress_rule` for new rules and warns against mixing inline rules with standalone rule resources, so the examples were updated to the newer rule resources.
- The conclusion claimed that VPC attachment adds 1-10 seconds to cold starts and recommended /24-or-larger subnets to avoid IP exhaustion. Current AWS Lambda documentation does not support those statements as general guidance. The conclusion was updated to reflect documented behavior: Lambda creates a Hyperplane ENI for a new subnet/security-group combination, initial attachment can leave the function pending for several minutes, and provisioned concurrency reduces cold starts.
- The introduction referred to an "AWS-managed VPC" and implied VPC access places Lambda into private subnets. This was tightened to AWS's current wording that Lambda runs in a Lambda-managed VPC by default and that you attach the function to your VPC through the selected subnets.

## Review Notes
- `python3.12` remains a valid Lambda runtime as of April 29, 2026.
- `tofu init`, `tofu plan`, and `tofu apply` are valid current OpenTofu commands.
- The execution role example still attaches both `AWSLambdaVPCAccessExecutionRole` and `AWSLambdaBasicExecutionRole`. This is functional, but the VPC access managed policy already includes CloudWatch Logs permissions, so the second attachment is redundant rather than required.
