# Validation Summary: How to Fix CloudFormation 'CREATE_FAILED' Stack Errors

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- AWS CloudFormation
- AWS CLI
- AWS Identity and Access Management (IAM)
- AWS Service Quotas
- Amazon VPC
- Amazon EC2 Elastic IPs
- AWS Lambda
- Amazon S3

## Sources Consulted
- AWS CLI Command Reference: cloudformation create-stack - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack.html
- AWS CLI Command Reference: cloudformation describe-stack-events - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/describe-stack-events.html
- AWS CLI Command Reference: cloudformation create-change-set - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-change-set.html
- AWS CloudFormation User Guide: DependsOn attribute - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-attribute-dependson.html
- AWS CloudFormation User Guide: CloudFormation quotas - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-limits.html
- AWS CloudFormation Template Reference: AWS::Lambda::Function - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-function.html
- AWS Lambda Developer Guide: Configure Lambda function timeout - https://docs.aws.amazon.com/lambda/latest/dg/configuration-timeout.html
- Amazon VPC User Guide: Amazon VPC quotas - https://docs.aws.amazon.com/vpc/latest/userguide/amazon-vpc-limits.html
- AWS General Reference: Amazon EC2 endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/ec2-service.html
- AWS General Reference: AWS service quotas - https://docs.aws.amazon.com/general/latest/gr/aws_service_limits.html
- AWS CLI Command Reference: service-quotas - https://docs.aws.amazon.com/cli/latest/reference/service-quotas/

## Issues Found
- The post said that default rollback behavior deletes the stack and makes events unavailable. AWS CLI documentation says the default create-stack failure behavior is `ROLLBACK`, and `describe-stack-events` can list deleted stack events if you provide the unique stack ID. Updated the text to distinguish rolled-back stacks from deleted stacks and explain why `--disable-rollback` is useful during development.
- The CloudFormation stack quota was listed as 200 stacks per region. Current AWS CloudFormation quotas list 2,000 stacks per account per region. Updated the value.
- The security group quota was listed as 500 security groups per VPC. Current Amazon VPC quotas list 2,500 VPC security groups per region. Updated the value and wording.
- The Lambda timeout type example used `"30"` as an invalid value. To avoid relying on ambiguous YAML/string coercion behavior, changed the invalid example to `thirty` and noted that Lambda timeout must be an integer from 1 to 900 seconds.
- The Lambda missing-required-property example claimed only `Runtime` was missing, but the snippet also omitted the required `Role` property. Added a placeholder execution role ARN so the example isolates the missing `Runtime` issue.

## Review Notes
- The AWS CLI commands and CloudFormation concepts are otherwise consistent with current official documentation.
- The change set example is valid for an existing stack. For a brand-new stack, CloudFormation change sets should include `--change-set-type CREATE`.
