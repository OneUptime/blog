# Validation Summary: How to Set Up Fargate Task Retirement Notifications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Fargate
- Amazon ECS
- Amazon EventBridge
- AWS Health
- Amazon SNS
- AWS Lambda
- Amazon CloudWatch custom metrics and alarms
- AWS CloudFormation
- Python / boto3
- Node.js signal handling

## Sources Consulted
- AWS ECS: Task retirement and maintenance for AWS Fargate on Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-maintenance.html
- AWS ECS: Prepare for AWS Fargate task retirement on Amazon ECS: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/prepare-task-retirement.html
- AWS ECS: Amazon ECS task state change events: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/ecs_task_events.html
- AWS CLI ECS stop-task reference, including valid `stopCode` values: https://docs.aws.amazon.com/cli/latest/reference/ecs/stop-task.html
- AWS ECS API ContainerDefinition, including `stopTimeout`: https://docs.aws.amazon.com/AmazonECS/latest/APIReference/API_ContainerDefinition.html
- AWS Health EventBridge schema: https://docs.aws.amazon.com/health/latest/ug/aws-health-events-eventbridge-schema.html
- AWS Health API Event reference: https://docs.aws.amazon.com/health/latest/APIReference/API_Event.html
- Amazon EventBridge resource-based policies: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Amazon EventBridge InputTransformer API reference: https://docs.aws.amazon.com/eventbridge/latest/APIReference/API_InputTransformer.html
- AWS CloudFormation AWS::Events::Rule reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-events-rule.html
- Referenced OneUptime post URL: https://oneuptime.com/blog/post/2026-02-12-monitor-ecs-tasks-cloudwatch-metrics/view

## Issues Found
- The post used an ECS task state change event with `stopCode` `TaskRetired` to detect retirements. Current ECS API/CLI documentation does not list `TaskRetired` as a valid stop code. Updated the retirement notification rule to match AWS Health events with `eventTypeCode` `AWS_ECS_TASK_PATCHING_RETIREMENT`.
- The retirement Lambda example processed ECS task-state fields such as `taskArn`, `clusterArn`, `stoppedReason`, and `group`. Updated it to process the AWS Health event shape, including `eventArn`, `eventTypeCode`, `eventRegion`, `statusCode`, `startTime`, and `affectedEntities`.
- The stop-code table and "unexpected task stops" rule included the invalid `TaskRetired` stop code. Removed it and added `TerminationNotice`, which is a documented ECS stop code.
- The CLI SNS target setup did not grant EventBridge permission to publish to the SNS topic. Added an SNS topic policy command.
- The SNS-to-Lambda subscription example did not grant SNS permission to invoke the Lambda function. Added the required `aws lambda add-permission` command.
- The CloudWatch alarm dimensions did not match the dimensions emitted by the custom metric after the Lambda correction. Updated the alarm dimensions to match `EventTypeCode` and `EventRegion`.
- The Python example used `datetime.utcnow()`, which is deprecated in modern Python. Updated it to `datetime.now(timezone.utc)`.
- The CloudFormation EventBridge rule matched ECS task-state events instead of AWS Health retirement notifications. Updated the template event pattern and added a policy document version.
- The opening explanation implied service task replacement is always successful. Adjusted the wording to reflect that ECS replaces service tasks when it can maintain desired count and that standalone tasks are not automatically replaced.

## Review Notes
- The AWS CLI was not installed in the local environment, so CLI flag validation was performed against official AWS CLI documentation rather than local `--help` output.
- Python and JavaScript snippets were syntax-checked locally.
