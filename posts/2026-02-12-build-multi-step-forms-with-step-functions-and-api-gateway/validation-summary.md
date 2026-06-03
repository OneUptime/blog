# Validation Summary: How to Build Multi-Step Forms with Step Functions and API Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Step Functions Standard Workflows
- Step Functions callback task-token pattern
- AWS Lambda
- Amazon API Gateway HTTP APIs
- Amazon DynamoDB
- AWS CLI
- Python and boto3
- Mermaid sequence diagrams

## Sources Consulted
- AWS Step Functions Developer Guide: Service integration patterns and callback task tokens - https://docs.aws.amazon.com/step-functions/latest/dg/connect-to-resource.html
- AWS Step Functions Developer Guide: Invoking Lambda with Step Functions - https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html
- AWS Step Functions Developer Guide: Choosing workflow type - https://docs.aws.amazon.com/step-functions/latest/dg/choosing-workflow-type.html
- AWS Step Functions API Reference: StartExecution - https://docs.aws.amazon.com/step-functions/latest/apireference/API_StartExecution.html
- AWS Step Functions API Reference: SendTaskSuccess - https://docs.aws.amazon.com/step-functions/latest/apireference/API_SendTaskSuccess.html
- AWS Step Functions API Reference: SendTaskFailure - https://docs.aws.amazon.com/step-functions/latest/apireference/API_SendTaskFailure.html
- AWS Step Functions API Reference: DescribeExecution - https://docs.aws.amazon.com/step-functions/latest/apireference/API_DescribeExecution.html
- AWS Step Functions Pricing - https://aws.amazon.com/step-functions/pricing/
- AWS CLI Command Reference: apigatewayv2 create-api - https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/create-api.html
- Referenced OneUptime article URL - https://oneuptime.com/blog/post/2026-02-12-monitor-api-endpoints-with-cloudwatch-synthetics/view

## Issues Found
- The architecture diagram and prose showed `StartExecution` returning a task token and `SendTaskSuccess` returning the next task token. AWS Step Functions `StartExecution` returns `executionArn` and `startDate`, while `SendTaskSuccess` returns an empty successful response. Updated the diagram and explanation so task tokens are delivered to the step handler Lambda and stored for the submit handler to look up.
- The submit handler used `SendTaskFailure` for form validation errors. That would close the current callback task and require matching `Catch` handling on the waiting task; in the shown state machine it would fail the execution. Updated the sample so validation errors return HTTP 400 without closing the task token, leaving the execution paused at the same step for retry.
- The step handler comment said the Lambda does not return to Step Functions. With the Lambda callback integration, the Lambda invocation returns, then the Task remains waiting for `SendTaskSuccess` or `SendTaskFailure`. Updated the comment.
- The status endpoint labeled `DescribeExecution` input as `currentInput`. `DescribeExecution` returns execution input metadata, not live current form progress. Updated the sample to return `executionInput` from Step Functions and current step/form data from the DynamoDB token table.
- The cost section used an imprecise transition estimate. Updated it to reflect roughly 5-6 transitions for the shown flow and an estimated $1.25-$1.50 for 10,000 completions before the free tier at the cited US East Standard Workflow state-transition price.
- The Express Workflow suggestion omitted that Express Workflows do not support callback task-token integrations. Updated it to limit the suggestion to single-session flows that do not need the callback pattern.
- The conclusion said the workflow could pause indefinitely and that the entire form state is managed by AWS. Updated it to clarify that Standard Workflows pause until callback or timeout, and that AWS manages workflow state.

## Review Notes
- The snippets are illustrative and omit production concerns such as IAM policies, API Gateway Lambda integration creation, DynamoDB table schema and TTL, authentication, idempotency for duplicate submissions, and cleanup of completed task-token rows.
- Verified that the JSON snippets parse and the Python snippets are syntactically valid after the corrections.
