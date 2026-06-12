# Validation Summary: How to Implement AWS Step Functions Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Step Functions
- Amazon States Language
- AWS Lambda
- Amazon DynamoDB
- Amazon S3
- Amazon SNS
- Amazon SQS
- AWS SAM
- Amazon CloudWatch
- AWS X-Ray
- AWS SDK for JavaScript v3

## Sources Consulted
- AWS Step Functions Developer Guide: Choosing workflow type in Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS Step Functions Developer Guide: Handling errors in Step Functions workflows - https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html
- AWS Step Functions Developer Guide: Using Map state in Inline mode - https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html
- AWS Step Functions Developer Guide: Using Map state in Distributed mode - https://docs.aws.amazon.com/step-functions/latest/dg/state-map-distributed.html
- AWS Step Functions Developer Guide: Discover service integration patterns - https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html
- AWS Step Functions Developer Guide: Fail workflow state - https://docs.aws.amazon.com/step-functions/latest/dg/state-fail.html
- AWS Step Functions Developer Guide: Monitoring Step Functions metrics using Amazon CloudWatch - https://docs.aws.amazon.com/step-functions/latest/dg/procedure-cw-metrics.html
- AWS Step Functions Developer Guide: Viewing execution details in the Step Functions console - https://docs.aws.amazon.com/step-functions/latest/dg/concepts-view-execution-details.html
- AWS Serverless Application Model Developer Guide: AWS::Serverless::StateMachine - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-statemachine.html
- AWS SDK for JavaScript v3 API Reference: SendTaskFailureCommand - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-sfn/Class/SendTaskFailureCommand
- AWS Step Functions Pricing - https://aws.amazon.com/step-functions/pricing/

## Issues Found
- Corrected the workflow type comparison. Standard workflow execution history is available for up to 90 days after completion, not indefinitely, and Express semantics differ between Asynchronous Express at-least-once and Synchronous Express at-most-once.
- Corrected the `States.ALL` description. It is a wildcard for known errors, but it does not catch terminal `States.DataLimitExceeded` and `States.Runtime` errors. Added current important built-in errors including `States.DataLimitExceeded`, `States.Runtime`, and `States.HeartbeatTimeout`.
- Clarified `MaxConcurrency: 0`. It removes the Map state's concurrency cap but execution is still bounded by Step Functions service quotas, so describing it as unlimited was misleading.
- Clarified Distributed Map support. Distributed mode is supported in Standard parent workflows, not Express parent workflows, although the child workflow executions can be Express.
- Fixed the callback JavaScript sample by importing `SendTaskFailureCommand`, which was used but not imported.
- Corrected the Express pricing example to use 64 MB billed memory and 100 ms duration, resulting in about $0.10 duration cost and about $1.10 total for 1 million executions.
- Fixed the complete ASL example's Fail state by replacing invalid `Cause.$` with the supported `CausePath` field.

## Review Notes
All fenced JSON examples parse as JSON after the fixes, and both JavaScript snippets pass a syntax check. The examples are illustrative and still require real ARNs, IAM permissions, log groups, and downstream service schemas to deploy in an AWS account.
