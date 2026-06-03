# Validation Summary: How to Configure Lambda Reserved Concurrency

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Lambda
- Lambda reserved concurrency
- Lambda provisioned concurrency
- Amazon CloudWatch metrics and alarms
- Amazon SQS event source mappings
- AWS CLI
- AWS SAM / CloudFormation
- Terraform AWS provider
- Python Lambda handlers

## Sources Consulted
- AWS Lambda: Configuring reserved concurrency for a function - https://docs.aws.amazon.com/lambda/latest/dg/configuration-concurrency.html
- AWS Lambda quotas - https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda: Handling errors for an SQS event source - https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS Lambda API: ListFunctions - https://docs.aws.amazon.com/lambda/latest/api/API_ListFunctions.html
- AWS Lambda API: GetFunctionConcurrency - https://docs.aws.amazon.com/lambda/latest/api/API_GetFunctionConcurrency.html
- AWS CLI: put-function-concurrency - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/lambda/put-function-concurrency.html
- AWS CLI: get-function-concurrency - https://docs.aws.amazon.com/cli/latest/reference/lambda/get-function-concurrency.html
- AWS CLI: create-event-source-mapping - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-event-source-mapping.html
- AWS CLI: cloudwatch get-metric-statistics - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS CLI: cloudwatch put-metric-alarm - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS Lambda: Viewing metrics for Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/monitoring-metrics-view.html
- AWS SAM: AWS::Serverless::Function - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- Terraform Registry: aws_lambda_function - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function

## Issues Found
- The opening stated that every AWS account has a default Lambda concurrency limit of 1,000. AWS documents 1,000 concurrent executions as the default regional quota, but also notes that new AWS accounts can start with reduced concurrency quotas. Updated the wording to include that caveat.
- The SQS overflow example suggested handler code could catch capacity-related throttling and enqueue the event. Reserved-concurrency throttling occurs before the handler runs, so the handler cannot catch that throttle. Replaced the example with an SQS event source mapping and clarified that Lambda backs off and retries queued messages when throttled.
- The CloudWatch `get-metric-statistics` example used BSD/macOS `date -v`, which is not portable to common Linux environments. Replaced the command substitution with explicit ISO 8601 timestamps accepted by the AWS CLI.
- The allocation script queried `ReservedConcurrentExecutions` from `list-functions`, but `ListFunctions` does not return that field. Replaced it with a loop that lists function names and calls `get-function-concurrency` for each function.

## Review Notes
The remaining AWS CLI commands, Lambda concurrency behavior, SAM property, Terraform argument, CloudWatch metric dimensions, reserved-concurrency zero behavior, and reserved-vs-provisioned concurrency comparison are consistent with the official documentation consulted.
