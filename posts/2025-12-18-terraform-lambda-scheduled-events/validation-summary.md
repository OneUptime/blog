# Validation Summary: How to Set Up Lambda with Scheduled Events in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS provider for Terraform
- HashiCorp Archive provider
- AWS Lambda
- Amazon EventBridge scheduled rules
- Amazon CloudWatch Logs and alarms
- AWS IAM
- AWS Secrets Manager
- Amazon VPC networking for Lambda
- Node.js
- Python

## Sources Consulted
- AWS Lambda supported runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda execution roles: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS Lambda VPC configuration and required IAM permissions: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS managed policy `AWSLambdaVPCAccessExecutionRole`: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaVPCAccessExecutionRole.html
- AWS Lambda scheduled invocation with EventBridge Scheduler: https://docs.aws.amazon.com/lambda/latest/dg/with-eventbridge-scheduler.html
- Amazon EventBridge scheduled rule patterns: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- Terraform AWS provider `aws_cloudwatch_event_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS provider `aws_cloudwatch_event_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform Archive provider `archive_file` data source: https://registry.terraform.io/providers/hashicorp/archive/latest/docs/data-sources/file
- Amazon CloudWatch `MetricAlarm` API reference: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/API_MetricAlarm.html

## Issues Found
- The introductory EventBridge wording did not mention that EventBridge scheduled rules are now documented by AWS as a legacy feature, with EventBridge Scheduler recommended for new scheduling use cases. I updated the wording to identify the tutorial's scheduled-rule approach as a legacy scheduling feature while preserving the post's Terraform resource focus.
- The basic Lambda example used `nodejs18.x`, which is deprecated in the current AWS Lambda runtime table. I changed it to the supported `nodejs24.x` runtime.
- The basic complete example used the `archive_file` data source without declaring the HashiCorp Archive provider in `required_providers`. I added an explicit `archive` provider requirement so the example is self-contained.
- The database cleanup Lambda imports `psycopg2`, which is not included in the managed Python runtime by default. I added a code comment stating that it must be packaged in the deployment ZIP or provided by a Lambda layer.
- The custom VPC IAM policy for the database cleanup Lambda omitted EC2 permissions AWS currently documents for Lambda VPC attachment. I added `ec2:DescribeSubnets`, `ec2:AssignPrivateIpAddresses`, and `ec2:UnassignPrivateIpAddresses`.

## Review Notes
- The Terraform resources shown for EventBridge rules, targets, Lambda permissions, Lambda functions, CloudWatch log groups, and CloudWatch alarms match the AWS provider resource model.
- The cron examples use AWS's six-field EventBridge cron format and correctly avoid using `*` in both day-of-month and day-of-week.
- The database cleanup example still assumes surrounding infrastructure such as the RDS instance, subnets, security group, secret, and alert SNS topic exists elsewhere, which is appropriate for a focused tutorial snippet.
