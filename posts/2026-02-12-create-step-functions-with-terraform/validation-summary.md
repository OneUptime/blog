# Validation Summary: How to Create Step Functions with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Step Functions
- Terraform AWS Provider
- Amazon States Language
- AWS IAM
- AWS Lambda
- Amazon CloudWatch Logs
- Amazon DynamoDB
- Amazon SQS
- Amazon EventBridge

## Sources Consulted
- AWS Step Functions: Choosing workflow type in Step Functions: https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS Step Functions: Using CloudWatch Logs to log execution history: https://docs.aws.amazon.com/step-functions/latest/dg/cw-logs.html
- AWS Step Functions: Task workflow state: https://docs.aws.amazon.com/step-functions/latest/dg/state-task.html
- AWS Step Functions: Parallel workflow state: https://docs.aws.amazon.com/step-functions/latest/dg/state-parallel.html
- AWS Step Functions: Using Map state in Inline mode: https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html
- AWS Step Functions: Perform DynamoDB CRUD operations: https://docs.aws.amazon.com/step-functions/latest/dg/connect-ddb.html
- AWS Step Functions: Send messages to an Amazon SQS queue: https://docs.aws.amazon.com/step-functions/latest/dg/connect-sqs.html
- Amazon EventBridge: IAM roles for sending events to targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-events-iam-roles.html
- Terraform AWS Provider: aws_sfn_state_machine resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/sfn_state_machine

## Issues Found
- The Express workflow billing description said Express charges per execution. AWS documents Express pricing as based on number of executions, execution duration, and memory consumption, so the bullet was updated.
- The Express logging example configured CloudWatch Logs but did not grant the Step Functions execution role the required CloudWatch Logs delivery permissions. Added an `aws_iam_role_policy` with the documented logging actions and `Resource = "*"`.
- The Express workflow debugging sentence implied only Standard workflows have visual execution history. Updated it to the more precise distinction that Express workflows do not record execution history in Step Functions the way Standard workflows do, so CloudWatch logging is required for execution history and results.
- The EventBridge trigger example referenced `aws_iam_role.eventbridge_sfn` without showing the required role trust policy or `states:StartExecution` permission. Added the IAM role and inline policy.

## Review Notes
The examples still use direct Lambda function ARNs in `Task` states. AWS supports this form, although the optimized Lambda integration ARN (`arn:aws:states:::lambda:invoke`) is the currently recommended pattern for new workflows.
