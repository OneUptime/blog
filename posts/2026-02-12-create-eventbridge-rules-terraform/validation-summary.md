# Validation Summary: How to Create EventBridge Rules with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EventBridge rules, event buses, targets, event patterns, scheduled rules, input transformers, and dead-letter queues
- AWS Lambda resource-based permissions
- Amazon SNS topic policies
- Amazon SQS queue policies and dead-letter queues
- Amazon S3 EventBridge notifications
- AWS Health events
- Terraform AWS provider
- Python boto3 EventBridge client

## Sources Consulted
- AWS EventBridge targets documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-targets.html
- AWS EventBridge scheduled rule pattern documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- AWS EventBridge resource-based policy documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- AWS EventBridge DLQ documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-rule-dlq.html
- Amazon S3 EventBridge documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/EventBridge.html
- Amazon S3 enabling EventBridge documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/enable-event-notifications-eventbridge.html
- AWS Health EventBridge schema documentation: https://docs.aws.amazon.com/health/latest/ug/aws-health-events-eventbridge-schema.html
- Terraform AWS provider `aws_cloudwatch_event_rule` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS provider `aws_cloudwatch_event_target` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider `aws_cloudwatch_event_bus_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_bus_policy
- Terraform AWS provider `aws_s3_bucket_notification` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_notification
- Terraform AWS provider `aws_lambda_permission` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS provider `aws_sqs_queue_policy` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sqs_queue_policy
- Boto3 EventBridge `put_events` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/events/client/put_events.html

## Issues Found
- The post described scheduled rules as the service to use for cron-style scheduled tasks. AWS now recommends EventBridge Scheduler for new standalone schedules, while scheduled rules remain supported. Updated the introductory and scheduling language to make that distinction.
- The default event bus description said it receives all AWS service events. This was too broad for services such as Amazon S3, where EventBridge delivery for object events must be enabled on the bucket. Updated the explanation.
- The custom event bus Lambda target omitted the required Lambda resource-based permission. Added an `aws_lambda_permission` resource scoped to the custom bus rule ARN.
- The S3 multiple-target example omitted `aws_s3_bucket_notification` with `eventbridge = true`, so the rule would not receive S3 object events as shown. Added the bucket notification resource and tied the event pattern to the bucket resource.
- The S3 Lambda target omitted the required Lambda permission for EventBridge invocation. Added an `aws_lambda_permission` resource scoped to the S3 rule ARN.
- The S3 SQS target omitted the required SQS queue resource policy allowing EventBridge to call `sqs:SendMessage`. Added an `aws_sqs_queue_policy` with a source ARN condition.
- The DLQ example omitted the SQS resource policy required when configuring EventBridge DLQs through API/Terraform. Added an `aws_sqs_queue_policy` allowing EventBridge to send failed events to the DLQ.

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate`. The snippets were reviewed against the current Terraform AWS provider registry and AWS service documentation. The `aws_cloudwatch_event_*` Terraform resource names remain current and are documented as EventBridge resources despite the older CloudWatch naming.
