# Validation Summary: How to Monitor SQS Queue Depth

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS (Simple Queue Service)
- Amazon CloudWatch (metrics, alarms, dashboards, metric math)
- AWS CLI
- Boto3 (Python AWS SDK)
- Terraform (`aws_cloudwatch_metric_alarm`, `aws_appautoscaling_target`, `aws_appautoscaling_policy`, `aws_cloudwatch_dashboard`)
- AWS CloudFormation
- Amazon ECS Application Auto Scaling (step scaling and target tracking)
- AWS Lambda (reserved concurrency, scheduled CloudWatch Events)
- Amazon SNS (alarm routing)
- Dead Letter Queues
- OneUptime telemetry API

## Sources Consulted
- AWS — Available CloudWatch metrics for Amazon SQS: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- AWS — Monitoring Amazon SQS queues using CloudWatch (publishing interval): https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/monitoring-using-cloudwatch.html
- AWS — Using CloudWatch metric math (RATE, METRICS): https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/using-metric-math.html
- AWS — Lambda reserved environment variables (`AWS_LAMBDA_FUNCTION_NAME`): https://docs.aws.amazon.com/lambda/latest/dg/configuration-envvars.html
- Boto3 reference — CloudWatch `get_metric_statistics`, `put_metric_data`
- Boto3 reference — SQS `get_queue_attributes` (attribute name `ApproximateNumberOfMessages`)
- Boto3 reference — Lambda `put_function_concurrency`, `get_function_concurrency`
- Terraform AWS provider docs — `aws_cloudwatch_metric_alarm`, `aws_appautoscaling_policy` (step and target-tracking)

## Issues Found
1. **Incorrect CloudWatch metric name for queue depth (used throughout).** The post used `ApproximateNumberOfMessages` as the CloudWatch metric name across the mermaid diagram, metric table, AWS CLI call, multiple `cloudwatch.get_metric_statistics` calls, Terraform `aws_cloudwatch_metric_alarm` resources, CloudFormation alarm definitions, the dashboard JSON, Terraform dashboard widgets, both ECS autoscaling alarms, the target-tracking policy, all five entries in the `STANDARD_ALERTS` list, the DLQ alarms, and the OneUptime metric key. The actual CloudWatch metric for visible messages is `ApproximateNumberOfMessagesVisible`. (The like-named *SQS GetQueueAttributes attribute* is `ApproximateNumberOfMessages` — distinct from the metric — so the `sqs.get_queue_attributes(AttributeNames=['ApproximateNumberOfMessages'])` call in the Lambda concurrency example is left correct.) Fixed every CloudWatch reference to use `ApproximateNumberOfMessagesVisible`.
2. **Incorrect metric publishing interval.** The post claimed "AWS automatically publishes SQS metrics to CloudWatch every five minutes (or one minute for detailed monitoring)." Per AWS docs, SQS pushes CloudWatch metrics at 1-minute intervals for active queues, and there is no "detailed monitoring" toggle for SQS (that is an EC2 concept). Rewrote the sentence to: "AWS automatically publishes SQS metrics to CloudWatch every minute for active queues, at no additional cost."
3. **Invalid CloudWatch Math `RATE()` example.** The post showed `RATE(METRICS("ApproximateNumberOfMessages")) > 10  # Growing by 10 msg/min`. `RATE()` operates on a single metric reference (e.g., `RATE(m1)`) and returns a per-second rate, not per-minute. Rewrote to use the documented form with a metric ID `m1` and an explicit `* 60` conversion to messages-per-minute.
4. **Wrong metric on the DLQ "growing" alarm.** The alarm used `NumberOfMessagesReceived` (which counts messages returned by `ReceiveMessage` calls, i.e., consumer reads) to indicate DLQ growth. The natural alternative `NumberOfMessagesSent` is also unsuitable here because SQS automatic redrive does not increment `NumberOfMessagesSent` on the target DLQ. Switched the alarm to `ApproximateNumberOfMessagesVisible` with statistic `Maximum`, updated the description and inline comment to reflect "messages accumulated in the DLQ," and added a short comment explaining the redrive caveat.
5. **Misleading statistic on the DLQ "not empty" alarm.** The alarm used `Statistic: Sum` on a gauge metric (`ApproximateNumberOfMessagesVisible`). Summing 60 one-minute samples of a level metric is not meaningful. Changed to `Maximum`, which is the conventional choice for "is anything in the queue right now."

## Review Notes
- `datetime.utcnow()` is used in the Python examples. It is deprecated in Python 3.12+ in favor of `datetime.now(timezone.utc)`. Functionally fine today but a future-readability concern; left unchanged since the post does not pin a Python version and the call still works.
- The bash example uses GNU `date -d '1 hour ago' ...` syntax, which is not portable to BSD `date` (macOS). Left unchanged — Linux is the assumed environment for the snippet.
- The step-scaling alarm pairs in the ECS section have overlapping evaluation conditions and use `period = 60` with a single evaluation period, which can be noisy in practice. The configuration is syntactically valid Terraform; this is a tuning concern, not a correctness issue.
- The Lambda self-adjusting concurrency function calls `put_function_concurrency` from inside the same function whose concurrency it edits. The boto3 call itself is correct; whether this is a great operational pattern (the function needs IAM permission to modify itself, and changes apply to all future invocations of that ARN) is a design judgement and not a technical error in the code shown.
- The OneUptime telemetry endpoint URL (`https://oneuptime.com/api/telemetry/metrics`) is illustrative; the broader OneUptime telemetry product is OpenTelemetry-based, but the post frames this as a custom integration example rather than an SDK reference, so the snippet is reasonable as written.
