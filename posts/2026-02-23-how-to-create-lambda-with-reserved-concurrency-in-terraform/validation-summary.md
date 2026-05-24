# Validation Summary: How to Create Lambda with Reserved Concurrency in Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- AWS Lambda (reserved concurrency)
- Terraform (HCL, `hashicorp/aws` provider, `hashicorp/archive` provider)
- AWS IAM (managed execution role)
- AWS CloudWatch metric alarms (`Throttles`, `ConcurrentExecutions`, `UnreservedConcurrentExecutions`)
- AWS SNS (alarm notifications)
- AWS VPC (subnet/security group config for VPC-attached Lambda)

## Sources Consulted
- AWS Lambda function scaling and concurrency quotas: https://docs.aws.amazon.com/lambda/latest/dg/lambda-concurrency.html
- AWS Lambda configuring reserved concurrency: https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html
- AWS Lambda runtimes (supported and deprecated): https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda CloudWatch metrics: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- Terraform `aws_lambda_function` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform `aws_cloudwatch_metric_alarm` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Terraform `archive_file` data source: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- AWS managed policy `AWSLambdaBasicExecutionRole`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaBasicExecutionRole.html

## Issues Found

1. **Deprecated Node.js runtime.** The post used `runtime = "nodejs20.x"` in five Lambda resources. As of today (2026-05-24), `nodejs20.x` is past its AWS-published deprecation date (Apr 30, 2026) and should not be presented as a recommended runtime. Updated all occurrences to `nodejs22.x`, which is currently supported.

2. **Incorrect characterization of the unreserved-concurrency floor.** The Best Practices section said "AWS recommends at least 100" unreserved concurrency. This is actually a hard limit enforced by AWS — Lambda will not let you reserve concurrency that would drop unreserved below 100. Rewrote the sentence to say AWS "enforces a hard minimum of 100 unreserved concurrent executions, so you cannot reserve so much that less than 100 remains."

## Review Notes

- All other technical claims verified accurate: `reserved_concurrent_executions` attribute name, `0` acting as a kill switch, the default 1,000 account-level regional concurrency limit, the dual guarantee-and-cap behavior of reserved concurrency, all three CloudWatch metric names and namespace, the `AWSLambdaBasicExecutionRole` managed policy ARN, and the reserved-vs-provisioned comparison table.
- Concurrency budget arithmetic in the locals block is correct: 200 + 100 + 80 + 50 + 100 + 30 = 560; 1000 − 560 = 440 unreserved, matching the inline comment.
- `UnreservedConcurrentExecutions` is an account-level metric (not per-function); the post's usage of it in the account-level alarm is correct.
- Numeric values for tag entries (e.g. `ReservedConcurrency = 200`) rely on HCL's implicit conversion to the `map(string)` tag schema. This works in current Terraform AWS provider versions, so it was left as-is; readers who prefer to be explicit can wrap with `tostring()`.
- `python3.11` is still supported, though `python3.12` or `python3.13` would be more future-proof. Left as written since it is a valid runtime today.
