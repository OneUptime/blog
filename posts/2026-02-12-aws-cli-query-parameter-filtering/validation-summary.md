# Validation Summary: How to Use AWS CLI --query Parameter for Filtering

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CLI
- JMESPath
- Amazon EC2
- AWS Cost Explorer
- Amazon RDS
- AWS Lambda
- Amazon ECS
- AWS CloudFormation
- Elastic Load Balancing
- Amazon CloudWatch
- Amazon S3
- AWS IAM

## Sources Consulted
- AWS CLI User Guide: Filtering output in the AWS CLI - https://docs.aws.amazon.com/cli/latest/userguide/cli-usage-filter.html
- AWS CLI Command Reference: ec2 describe-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- AWS CLI Command Reference: ce get-cost-and-usage - https://docs.aws.amazon.com/cli/latest/reference/ce/get-cost-and-usage.html
- AWS CLI Command Reference: lambda list-functions - https://docs.aws.amazon.com/cli/latest/reference/lambda/list-functions.html
- AWS CLI Command Reference: ecs describe-task-definition - https://docs.aws.amazon.com/cli/latest/reference/ecs/describe-task-definition.html
- AWS CLI Command Reference: rds describe-db-instances - https://docs.aws.amazon.com/cli/latest/reference/rds/describe-db-instances.html
- AWS Lambda Developer Guide: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- JMESPath Specification - https://jmespath.org/specification.html
- JMESPath Functions - https://jmespath.org/proposals/functions.html
- Referenced OneUptime blog links were opened and confirmed to resolve.

## Issues Found
- The "missing CostCenter tag" EC2 query used `?!Tags[?Key=='CostCenter']`, which does not reliably select instances with no matching tag, especially untagged instances. Changed it to compare the first matching tag to `null`.
- The Cost Explorer example said "this month" but used `End=2026-02-12`; AWS Cost Explorer treats the end date as exclusive, so that range only covers February 1 through February 11, 2026. Changed the example to cover February 2026 with `End=2026-03-01`.
- The Lambda code-size projection labeled `CodeSize` as `CodeSizeMB` without converting bytes to megabytes. Changed the column name to `CodeSizeBytes`.
- The Lambda deprecated runtime example was missing runtimes that AWS currently lists as deprecated, including `nodejs20.x`, `ruby3.2`, `python3.9`, `nodejs18.x`, and `dotnet6`. Added those identifiers to the sample query.
- The ECS container ports query used `join(', ', @[].to_string(@))`, which is an invalid JMESPath function call shape. Changed it to convert each `containerPort` to a string before joining.
- The snapshot query comment said "created after" while the expression used `>=`. Changed the comment to "created on or after" to match the query.

## Review Notes
- The local environment did not have the AWS CLI installed, so commands could not be executed against AWS from this workspace. Syntax and expression behavior were checked against official AWS/JMESPath documentation and with local JMESPath evaluation using AWS-shaped sample JSON.
- Several commands use client-side `--query` filtering on paginated AWS CLI operations. This is valid, but AWS documents that `--output text` can apply queries per page for paginated responses, which may surprise users in some single-value extraction cases.
