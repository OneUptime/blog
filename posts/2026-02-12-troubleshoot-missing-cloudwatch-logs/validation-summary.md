# Validation Summary: How to Troubleshoot Missing CloudWatch Logs

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon CloudWatch Logs
- AWS CLI
- CloudWatch agent for EC2
- AWS Lambda
- Amazon ECS awslogs log driver
- Amazon API Gateway REST API logging
- Amazon VPC Flow Logs
- AWS CloudTrail
- IAM policies and execution roles

## Sources Consulted
- AWS CLI Command Reference: CloudWatch Logs describe-log-groups: https://docs.aws.amazon.com/cli/latest/reference/logs/describe-log-groups.html
- AWS CLI Command Reference: CloudWatch Logs describe-log-streams: https://docs.aws.amazon.com/cli/latest/reference/logs/describe-log-streams.html
- Amazon CloudWatch agent configuration file details: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Agent-Configuration-File-Details.html
- AWS Lambda: Sending function logs to CloudWatch Logs: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-functions-logs.html
- AWS Lambda: Configuring CloudWatch log groups: https://docs.aws.amazon.com/lambda/latest/dg/monitoring-cloudwatchlogs-loggroups.html
- AWS managed policy reference: AWSLambdaBasicExecutionRole: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSLambdaBasicExecutionRole.html
- Amazon ECS: Send ECS logs to CloudWatch: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/using_awslogs.html
- AWS managed policy reference: AmazonECSTaskExecutionRolePolicy: https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AmazonECSTaskExecutionRolePolicy.html
- Amazon API Gateway: Set up CloudWatch logging for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-logging.html
- Amazon API Gateway API Reference: Stage and UpdateStage: https://docs.aws.amazon.com/apigateway/latest/api/API_Stage.html
- AWS CLI Command Reference: API Gateway update-stage: https://docs.aws.amazon.com/cli/latest/reference/apigateway/update-stage.html
- AWS CLI Command Reference: EC2 create-flow-logs: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- AWS CLI Command Reference: CloudTrail lookup-events: https://docs.aws.amazon.com/cli/latest/reference/cloudtrail/lookup-events.html

## Issues Found
- Removed JavaScript-style comments from `json` code fences because comments make the examples invalid JSON.
- Removed the ineffective CloudWatch agent `timezone` field from the example because AWS documents that `timezone` is ignored unless `timestamp_format` is also specified.
- Updated the Lambda minimum policy resource to `*`, matching the official `AWSLambdaBasicExecutionRole` managed policy.
- Corrected the generic Lambda-in-VPC claim. Standard Lambda runtime logs are not described by AWS as requiring VPC routing; VPC routing is required for Lambda Managed Instances and for code or extensions that call CloudWatch Logs APIs directly from the VPC.
- Corrected ECS logging guidance to distinguish Fargate task execution role behavior from EC2 launch type container instance or execution role behavior.
- Removed `logs:CreateLogGroup` from the baseline ECS execution role snippet because the official `AmazonECSTaskExecutionRolePolicy` includes `logs:CreateLogStream` and `logs:PutLogEvents`; noted that `logs:CreateLogGroup` is needed when relying on `awslogs-create-group`.
- Replaced the claim that ECS tasks might silently drop logs when the log group is missing with the more accurate statement that the task can fail with a log driver initialization error.
- Corrected the API Gateway section to distinguish access logging and execution logging, added the required access log `format`, and changed the REST API patch path to `/accessLogSettings/...`.
- Fixed an invalid retention-check command that used `describe-log-groups --log-group-name`; the AWS CLI supports `--log-group-name-prefix` or `--log-group-name-pattern`, not `--log-group-name`, for `describe-log-groups`.
- Updated the quick-fix table to avoid overgeneralizing Lambda VPC logging and to mention `logs:CreateLogGroup` only when the source creates log groups.

## Review Notes
The local environment did not have the AWS CLI installed, so command verification was performed against official AWS CLI and service documentation. The CloudWatch agent state-file cleanup path remains a practical troubleshooting example, but AWS documentation is limited on exact internal state file locations and they can vary by agent version or packaging.
