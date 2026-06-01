# Validation Summary: How to Use AWS Step Functions Workflow Studio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Step Functions
- Step Functions Workflow Studio
- Amazon States Language (ASL)
- AWS Lambda service integrations
- Amazon SNS service integrations
- Amazon DynamoDB service integrations
- Amazon SQS service integrations
- AWS CLI
- Standard and Express Workflows

## Sources Consulted
- AWS Step Functions: Developing workflows in Workflow Studio: https://docs.aws.amazon.com/step-functions/latest/dg/workflow-studio.html
- AWS Step Functions: Creating a workflow with Workflow Studio: https://docs.aws.amazon.com/step-functions/latest/dg/workflow-studio-create.html
- AWS Step Functions: Task workflow state: https://docs.aws.amazon.com/step-functions/latest/dg/state-task.html
- AWS Step Functions: Invoke an AWS Lambda function: https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html
- AWS Step Functions: Discover service integration patterns: https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html
- AWS Step Functions: Perform DynamoDB CRUD operations: https://docs.aws.amazon.com/step-functions/latest/dg/connect-ddb.html
- AWS Step Functions: Inline Map state: https://docs.aws.amazon.com/step-functions/latest/dg/state-map-inline.html
- AWS Step Functions: Choosing workflow type: https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS Step Functions: Intrinsic functions for JSONPath states: https://docs.aws.amazon.com/step-functions/latest/dg/intrinsic-functions.html
- AWS CLI Command Reference: create-state-machine: https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/create-state-machine.html
- AWS CLI Command Reference: start-execution: https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/start-execution.html
- AWS CLI Command Reference: describe-state-machine: https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/describe-state-machine.html
- OneUptime linked article: https://oneuptime.com/blog/post/2026-02-12-set-up-aws-application-composer-for-visual-design/view

## Issues Found
- The post said the AWS CLI `create-state-machine` command opens Workflow Studio. The CLI creates a state machine but does not open the console editor, so the comment was changed to describe CLI creation only.
- The console navigation was incomplete. It now includes choosing "Create from blank" and continuing into Workflow Studio, matching the AWS documentation flow.
- The order workflow listed a Pass state that was not present in the generated ASL and described the notification step as a Lambda Invoke even though the ASL uses SNS Publish. The state list was corrected.
- The Lambda task examples used the legacy direct Lambda ARN resource form while describing Workflow Studio's Lambda Invoke action. The generated ASL was updated to use the current optimized Lambda integration, `arn:aws:states:::lambda:invoke`, with `Parameters`, `Payload.$`, and payload result handling.
- The retry example used an incomplete error name, `ServiceException`. It was corrected to Lambda-prefixed error names such as `Lambda.ServiceException` and `Lambda.TooManyRequestsException`.
- The error-handling prose referenced a non-existent `HandlePaymentError` state. It now points to the `Handle Processing Error` state used by the ASL.
- A JSON code block contained a JavaScript-style comment, making it invalid JSON. The explanatory comment was moved into regular prose.
- The Map state wording referred to iterator configuration. It was updated to avoid the deprecated `Iterator` terminology and align with current `ItemProcessor` guidance.
- The Express Workflow history claim was too broad. It now says Express Workflows do not keep durable execution history in Step Functions and should send execution history to CloudWatch Logs.
- The service integration count was updated from 200+ to 220+ services via SDK integrations.
- The final IAM wording was tightened from "handles IAM permissions" to "IAM permission generation" to reflect what Workflow Studio and Step Functions generate or help review.

## Review Notes
- The AWS CLI was not installed in the local environment, so command validation was performed against the official AWS CLI Command Reference.
- The JSON snippets in the post were parsed locally after edits and are syntactically valid JSON.
- The ASL examples use JSONPath-style `Parameters`, `ResultSelector`, and `OutputPath`, which remain supported. AWS documentation also shows JSONata-style `Arguments` and `Output` examples for newer workflows.
