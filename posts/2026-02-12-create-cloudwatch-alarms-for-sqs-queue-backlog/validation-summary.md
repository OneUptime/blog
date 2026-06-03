# Validation Summary: How to Create CloudWatch Alarms for SQS Queue Backlog

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon SQS
- Amazon CloudWatch metrics and alarms
- AWS CLI
- Amazon SNS alarm actions
- AWS Application Auto Scaling
- Amazon ECS service auto scaling

## Sources Consulted
- Amazon SQS Developer Guide: Available CloudWatch metrics for Amazon SQS - https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-available-cloudwatch-metrics.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI Command Reference: application-autoscaling put-scaling-policy - https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/put-scaling-policy.html
- Application Auto Scaling User Guide: How target tracking scaling works - https://docs.aws.amazon.com/autoscaling/application/userguide/target-tracking-scaling-policy-overview.html
- Amazon EC2 Auto Scaling User Guide: Scaling policy based on Amazon SQS - https://docs.aws.amazon.com/autoscaling/ec2/userguide/as-using-sqs-queue.html
- Amazon ECS Developer Guide: Use a target metric to scale Amazon ECS services - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service-autoscaling-targettracking.html

## Issues Found
- `NumberOfMessagesDeleted` was described as messages successfully processed. AWS documents it as successful delete operations, and it can include duplicate deletes; changed the description to say deleted, usually after processing.
- The post referred to a "ratio" of sent to deleted metrics, but the example uses metric math subtraction. Changed this to "comparison of sent to deleted."
- The no-consumer alarm said missing data likely means no messages were deleted and is exactly the problem. SQS metrics can be missing when queues are idle, so the note now limits this pattern to queues that should continuously delete messages.
- The backlog growth alarm description said it fires whenever more messages are sent than deleted for 30 minutes, but the threshold requires net growth greater than 100 messages per period. Updated the wording.
- The autoscaling example used raw `ApproximateNumberOfMessagesVisible` as a target tracking metric and said it keeps queue depth around 100. AWS recommends a metric proportional to capacity for target tracking, such as backlog per instance/task, so the example now uses a custom `BacklogPerTask` metric and clarifies that the ECS service must already be registered as a scalable target.

## Review Notes
The CloudWatch alarm commands and metric math structure match the current AWS CLI documentation. The AWS CLI was not installed in the local environment, so command validation was performed against official AWS CLI references rather than local `--help` output.
