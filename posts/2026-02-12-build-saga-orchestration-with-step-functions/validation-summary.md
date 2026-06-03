# Validation Summary: How to Build Saga Orchestration with Step Functions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Step Functions
- Amazon States Language
- AWS Lambda
- AWS CLI
- AWS Identity and Access Management
- Amazon DynamoDB
- Python
- boto3
- Saga orchestration and compensating transactions

## Sources Consulted
- AWS Step Functions Developer Guide: Task workflow state: https://docs.aws.amazon.com/step-functions/latest/dg/state-task.html
- AWS Step Functions Developer Guide: Invoke an AWS Lambda function with Step Functions: https://docs.aws.amazon.com/step-functions/latest/dg/connect-lambda.html
- AWS Step Functions Developer Guide: Handling errors in Step Functions workflows: https://docs.aws.amazon.com/step-functions/latest/dg/concepts-error-handling.html
- AWS CLI Command Reference: stepfunctions create-state-machine: https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/create-state-machine.html
- AWS CLI Command Reference: stepfunctions start-execution: https://docs.aws.amazon.com/cli/latest/reference/stepfunctions/start-execution.html
- Boto3 DynamoDB update_item reference: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/update_item.html
- Boto3 DynamoDB type serializer source documentation: https://docs.aws.amazon.com/boto3/latest/_modules/boto3/dynamodb/types.html
- AWS IAM User Guide: Grammar of the IAM JSON policy language: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_grammar.html

## Issues Found
- The IAM policy snippet was marked as JSON but included a JavaScript-style `//` comment, which is invalid JSON and invalid IAM policy syntax. Removed the inline comment so the snippet parses as JSON.
- The inventory reservation Lambda updated items one by one and only wrote the saga transaction record after all updates completed. If a later item update or the saga-record write failed, earlier inventory decrements could remain without a compensation record, while the state machine would only refund payment. Updated the example to roll back any reserved items inside the local inventory step before re-raising the error.
- The original inventory reservation record stored the full order item objects, including floating-point `price` values from the sample Step Functions input. boto3's DynamoDB serializer does not support Python `float` values. Updated the stored reservation record to keep only `productId` and integer `quantity`, which are the fields needed by the compensating release step.

## Review Notes
The AWS CLI is not installed in this workspace, so CLI command validation was performed against the official AWS CLI command reference rather than local `aws --help` output. The snippets remain illustrative and assume the DynamoDB tables, primary keys, Lambda functions, IAM trust policy, payment provider logic, and alerting implementation exist.
