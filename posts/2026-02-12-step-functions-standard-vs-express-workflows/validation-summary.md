# Validation Summary: Use Step Functions Standard vs Express Workflows

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Step Functions
- Standard Workflows
- Express Workflows
- AWS CLI
- Amazon SQS service integrations
- AWS SDK for JavaScript v3
- CloudWatch Logs

## Sources Consulted
- AWS Step Functions Developer Guide: Choosing workflow type in Step Functions: https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS Step Functions Developer Guide: Step Functions service quotas: https://docs.aws.amazon.com/step-functions/latest/dg/service-quotas.html
- AWS Step Functions Developer Guide: Send messages to an Amazon SQS queue with Step Functions: https://docs.aws.amazon.com/step-functions/latest/dg/connect-sqs.html
- AWS Step Functions Developer Guide: Viewing execution details in the Step Functions console: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-view-execution-details.html
- AWS CLI Command Reference: stepfunctions create-state-machine: https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/create-state-machine.html
- AWS SDK for JavaScript v3: SFN client and StartSyncExecutionCommand: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/sfn/
- AWS Step Functions Pricing: https://aws.amazon.com/step-functions/pricing/

## Issues Found
- The post described Express workflows as only at-least-once. Updated the comparison and recommendation text to distinguish Asynchronous Express at-least-once execution from Synchronous Express at-most-once execution.
- The quick comparison used stale fixed execution-rate numbers. Replaced them with quota-based wording that reflects current AWS documentation, where execution start rates depend on regional API quotas and synchronous Express executions scale on demand.
- The synchronous Express JSON snippet was described as creating a synchronous workflow. Updated the wording because synchronous versus asynchronous is determined by invocation method, such as `StartSyncExecution`, not by a separate state machine definition subtype.
- Several placeholder ARNs and SQS URLs used 9-digit account IDs. Updated them to structurally valid 12-digit placeholder account IDs.
- The employee onboarding SQS callback example omitted required SQS message parameters. Added `QueueUrl` and `MessageBody` with the task token and employee ID.
- The monitoring section implied Express execution history is simply pushed to CloudWatch Logs. Updated it to say Express workflows rely on CloudWatch Logs and logging should be enabled.

## Review Notes
Pricing examples match current AWS pricing structure before applying any free tier. AWS quotas and prices can vary by Region and may change over time, so future reviews should re-check the Step Functions pricing and service quota pages.
