# Validation Summary: How to Use the IAM Policy Visual Editor

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Identity and Access Management (IAM)
- IAM policies and the IAM policy visual editor
- Amazon S3 IAM actions and ARN formats
- Amazon EC2 IAM actions
- AWS Lambda IAM actions
- Amazon CloudWatch and CloudWatch Logs IAM actions
- IAM Policy Simulator and IAM Access Analyzer policy validation

## Sources Consulted
- AWS IAM User Guide: Create IAM policies in the console - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_create-console.html
- AWS IAM User Guide: Troubleshoot IAM policies and policy restructuring - https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot_policies.html
- AWS IAM User Guide: IAM policy validation - https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_policy-validator.html
- AWS IAM User Guide: Validate policies with IAM Access Analyzer - https://docs.aws.amazon.com/IAM/latest/UserGuide/access-analyzer-policy-validation.html
- AWS IAM User Guide: IAM policy variables and tags - https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html
- AWS Service Authorization Reference: Amazon S3 - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazons3.html
- Amazon S3 User Guide: How Amazon S3 works with IAM - https://docs.aws.amazon.com/AmazonS3/latest/userguide/using-with-s3-actions.html
- AWS Service Authorization Reference: Amazon EC2 - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonec2.html
- AWS Service Authorization Reference: AWS Lambda - https://docs.aws.amazon.com/service-authorization/latest/reference/list_awslambda.html
- AWS Service Authorization Reference: Amazon CloudWatch - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatch.html
- AWS Service Authorization Reference: Amazon CloudWatch Logs - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncloudwatchlogs.html

## Issues Found
- The Lambda developer policy placed `lambda:ListFunctions` in the same statement as function-scoped actions with a function ARN resource. AWS Lambda `ListFunctions` does not support resource-level permissions, so it must use `Resource: "*"`. I split it into a separate `LambdaListAccess` statement and updated the visual-editor block description.
- The CloudWatch Logs example said specific log group ARNs could be used for `DescribeLogGroups`, `GetLogEvents`, and `FilterLogEvents` together. `DescribeLogGroups` does not support resource-level permissions, while `GetLogEvents` and `FilterLogEvents` support log group resources. I clarified that `DescribeLogGroups` should be split into an all-resources statement when using specific log group ARNs for the other actions.

## Review Notes
The remaining examples are syntactically valid IAM JSON and align with AWS documentation. The broad wildcard examples are technically valid but should be treated as illustrative; production policies should be narrowed using least-privilege review and IAM Access Analyzer where possible.
