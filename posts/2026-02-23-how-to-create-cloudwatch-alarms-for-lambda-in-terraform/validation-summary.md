# Validation Summary: How to Create CloudWatch Alarms for Lambda in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS Lambda
- Amazon CloudWatch alarms and metric math
- Amazon SNS
- Amazon SQS dead-letter queues

## Sources Consulted
- AWS Lambda documentation: Using CloudWatch metrics with Lambda - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics.html
- AWS Lambda documentation: Types of metrics for Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-types.html
- AWS Lambda documentation: Viewing metrics for Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-view.html
- Amazon CloudWatch documentation: Using math expressions with CloudWatch metrics - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html
- Amazon CloudWatch documentation: Create a CloudWatch alarm based on a metric math expression - https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/Create-alarm-on-metric-math-expression.html
- Terraform AWS Provider documentation: aws_cloudwatch_metric_alarm - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- Amazon SQS documentation: Available CloudWatch metrics for Amazon SQS - https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- Amazon SQS documentation: Creating alarms for dead-letter queues using Amazon CloudWatch - https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/dead-letter-queues-alarms-cloudwatch.html

## Issues Found
- The absolute Lambda error alarm description said it triggered on more than 5 errors in 5 minutes, but the Terraform configuration used two 5-minute evaluation periods. Updated the description to match the actual two consecutive 5-minute periods.
- The Lambda error-rate metric math divided errors by invocations directly. During idle periods, invocations can be zero or missing, so the expression was updated to use CloudWatch metric math `IF` and return 0 when there are no invocations.
- The SQS dead-letter queue alarm used `Sum` for `ApproximateNumberOfMessagesVisible`. Because this metric represents current queue depth, the alarm now uses `Maximum` over the period to detect any visible DLQ messages without summing backlog snapshots.
- The reusable module declared `error_rate_threshold` but did not use it. Removed the unused variable from the snippet.

## Review Notes
- The AWS Lambda metric names, namespaces, and `FunctionName` dimension usage are consistent with AWS documentation.
- Terraform was not installed in the local environment, so syntax was reviewed manually against the Terraform AWS Provider documentation rather than validated with `terraform validate`.
