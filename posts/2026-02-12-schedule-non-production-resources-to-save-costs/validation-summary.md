# Validation Summary: How to Schedule Non-Production Resources to Save Costs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Instance Scheduler on AWS
- AWS CloudFormation
- AWS CLI
- Amazon EventBridge scheduled rules and EventBridge Scheduler
- AWS Lambda
- Amazon EC2
- Amazon RDS
- Amazon ECS
- AWS Cost Explorer
- Python with boto3

## Sources Consulted
- AWS Instance Scheduler on AWS CloudFormation templates: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/aws-cloudformation-templates.html
- AWS Instance Scheduler on AWS Scheduler CLI: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/scheduler-cli-4.html
- AWS Instance Scheduler on AWS solution overview: https://docs.aws.amazon.com/solutions/latest/instance-scheduler-on-aws/solution-overview.html
- AWS CLI `cloudformation create-stack`: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack.html
- AWS CLI `events put-rule`: https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- AWS CLI `events put-targets`: https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- Amazon EventBridge resource-based policies for Lambda targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- Amazon EventBridge Scheduler schedule types: https://docs.aws.amazon.com/scheduler/latest/UserGuide/schedule-types.html
- AWS CLI `lambda add-permission`: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- boto3 EC2 `start_instances`: https://docs.aws.amazon.com/boto3/latest/reference/services/ec2/client/start_instances.html
- boto3 RDS `stop_db_instance`: https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/stop_db_instance.html
- boto3 ECS `update_service`: https://docs.aws.amazon.com/boto3/latest/reference/services/ecs/client/update_service.html
- boto3 Cost Explorer `get_cost_and_usage`: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_cost_and_usage.html

## Issues Found
- The Instance Scheduler CloudFormation command used `CAPABILITY_IAM`, but the current template defines named IAM roles. Changed it to `CAPABILITY_NAMED_IAM`.
- The Instance Scheduler CloudFormation command used `ScheduleLambdaMemory`, which is not a current template parameter. Changed it to `MemorySize`.
- The Scheduler CLI examples omitted the required `--stack` common argument. Added `--stack instance-scheduler`.
- The schedule was created before the referenced period. Reordered the Scheduler CLI commands so the period is created first.
- The custom Lambda example imported `pytz` and `datetime` even though they were unused. Removed those imports so the snippet does not require packaging an unnecessary dependency.
- The RDS start/stop loop would try `start_db_instance` or `stop_db_instance` against Aurora instances, which those APIs do not support. Added a skip for Aurora engines.
- The EventBridge CLI setup added Lambda targets but did not grant EventBridge permission to invoke the Lambda functions. Added `aws lambda add-permission` commands for both scheduled rules.
- The EventBridge cron note described Eastern Time conversion only for EST. Clarified that the shown UTC cron expressions match 8 AM/8 PM Eastern during EST and need adjustment during daylight saving time, or EventBridge Scheduler with an `America/New_York` time zone.
- The override parsing used `replace(tzinfo=timezone.utc)`, which can mis-handle timezone-aware ISO timestamps. Updated it to parse `Z`, preserve naive UTC timestamps, and convert aware timestamps to UTC.

## Review Notes
The examples are intentionally simplified and still need production hardening such as pagination for large EC2/RDS fleets, IAM least-privilege policies, Lambda deployment packaging, and error handling for resources in transitional states. RDS stopped DB instances can also restart automatically after seven days, which is worth calling out in a future expansion.
