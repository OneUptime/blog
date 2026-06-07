# Validation Summary: How to Monitor SQS with CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS (Simple Queue Service)
- Amazon CloudWatch (Metrics, Alarms, Dashboards)
- AWS CLI
- Python (boto3 SDK)
- Terraform (`aws_cloudwatch_metric_alarm`)
- AWS CloudFormation (`AWS::CloudWatch::Dashboard`)
- Amazon SNS (for alarm notifications)
- Mermaid (for diagrams)

## Sources Consulted
- Amazon SQS CloudWatch Metrics documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- Amazon SQS queue attributes (`GetQueueAttributes`): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_GetQueueAttributes.html
- Amazon SQS message system attributes (`ReceiveMessage`): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_ReceiveMessage.html
- boto3 SQS / CloudWatch client reference (`get_queue_attributes`, `receive_message`, `change_message_visibility`, `get_metric_statistics`, `put_metric_data`, `put_metric_alarm`)
- Terraform AWS provider docs for `aws_cloudwatch_metric_alarm`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_metric_alarm
- AWS CloudFormation reference for `AWS::CloudWatch::Dashboard`
- AWS CLI references for `aws cloudwatch get-metric-statistics`, `aws ecs describe-services`, `aws logs filter-log-events`

## Issues Found
No technical issues found.

All CloudWatch metric names used (`ApproximateNumberOfMessagesVisible`, `ApproximateNumberOfMessagesNotVisible`, `ApproximateNumberOfMessagesDelayed`, `NumberOfMessagesSent`, `NumberOfMessagesReceived`, `NumberOfMessagesDeleted`, `ApproximateAgeOfOldestMessage`, `SentMessageSize`) match AWS's published SQS namespace. The corresponding queue-level attribute names returned by `GetQueueAttributes` (`ApproximateNumberOfMessages`, `ApproximateNumberOfMessagesNotVisible`, `ApproximateNumberOfMessagesDelayed`) are also correct — note that the SQS *metric* uses `ApproximateNumberOfMessagesVisible` while the SQS *attribute* is `ApproximateNumberOfMessages`, and the post handles this distinction correctly in the boto3 examples.

The Terraform `aws_cloudwatch_metric_alarm` resource arguments (`alarm_name`, `comparison_operator`, `evaluation_periods`, `metric_name`, `namespace`, `period`, `statistic`, `threshold`, `dimensions`, `alarm_actions`, `ok_actions`, `treat_missing_data`) and the `treat_missing_data = "notBreaching"` value are all valid.

The boto3 `put_metric_alarm` arguments and the `TreatMissingData='notBreaching'` value match the API.

The `DeadLetterQueueSourceArn` message system attribute used in the DLQ analysis snippet is a real attribute (added with the SQS DLQ redrive feature) and is requested via `AttributeNames=['All']`.

CloudFormation dashboard widget layout uses widths that respect the 24-column grid, and the metric expressions with `["."]` shorthand are valid.

AWS CLI flag usage (`get-metric-statistics --namespace ... --metric-name ... --dimensions Name=...,Value=...`, `filter-log-events --start-time` in ms since epoch, `ecs describe-services --query`) is correct.

## Review Notes
- `datetime.utcnow()` is used throughout the Python examples. This call is deprecated as of Python 3.12 in favor of `datetime.now(timezone.utc)`. The code still runs (with a `DeprecationWarning`) on current Python versions, so it is not a correctness issue today but may need updating in the future.
- The `Generator` typing annotation in `track_processing_time` is used unparameterized. This works at runtime but stricter type checkers prefer `Generator[None, None, None]` or `Iterator[None]`. Not a technical error.
- The tiered alerting configuration uses `Statistic='Average'` for DLQ counts (via the `metric_to_cloudwatch` mapping logic), while the earlier Terraform DLQ example uses `Sum`. Either works for a low-cardinality gauge but `Maximum` would be a more conservative choice. Not incorrect, just a design trade-off.
- The OneUptime metrics endpoint URL (`https://oneuptime.com/api/v1/metrics`) is presented as illustrative — the post explicitly notes "replace with your actual endpoint" — so no verification is necessary.
