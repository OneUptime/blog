# Validation Summary: How to Build a Serverless Application Platform with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform HCL
- AWS Provider for Terraform/OpenTofu
- Amazon DynamoDB
- Amazon SQS and dead-letter queues
- AWS Lambda
- Amazon API Gateway HTTP APIs
- Amazon EventBridge
- Amazon CloudWatch alarms and access logs
- AWS KMS

## Sources Consulted
- Terraform AWS Provider `aws_dynamodb_table`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dynamodb_table.html.markdown
- Terraform AWS Provider `aws_sqs_queue`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/sqs_queue.html.markdown
- Terraform AWS Provider `aws_lambda_function`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function.html.markdown
- Terraform AWS Provider `aws_lambda_event_source_mapping`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_event_source_mapping.html.markdown
- Terraform AWS Provider `aws_apigatewayv2_api`, `aws_apigatewayv2_stage`, `aws_apigatewayv2_integration`, and `aws_apigatewayv2_route`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_api.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_stage.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_integration.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_route.html.markdown
- Terraform AWS Provider `aws_cloudwatch_event_bus`, `aws_cloudwatch_event_rule`, `aws_cloudwatch_event_target`, and `aws_lambda_permission`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_bus.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_rule.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_event_target.html.markdown, https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_permission.html.markdown
- Terraform AWS Provider `aws_cloudwatch_metric_alarm`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudwatch_metric_alarm.html.markdown
- AWS Lambda SQS event source mapping configuration: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS Lambda SQS partial batch response handling: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-errorhandling.html
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda with API Gateway: https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
- API Gateway HTTP API Lambda proxy integrations: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- API Gateway HTTP API CORS and access log variables: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html, https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging-variables.html
- EventBridge resource-based policies for Lambda targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html

## Issues Found
- The DynamoDB GSI used the deprecated `global_secondary_index.hash_key` argument. Changed it to the current `key_schema` block form.
- The SQS visibility timeout was equal to the `event_processor` Lambda timeout. AWS recommends setting the queue visibility timeout to at least six times the Lambda timeout for SQS event source mappings, so it was changed from `300` to `1800` seconds.
- The SQS redrive policy used `maxReceiveCount = 3`. AWS recommends at least `5` for Lambda/SQS retries before sending messages to a DLQ, so it was changed to `5`.
- The Lambda runtime used `nodejs20.x`, which AWS lists with a deprecation date of April 30, 2026. Updated the example to `nodejs22.x`.
- The HTTP API Gateway snippet created an API and stage but did not connect requests to the `api_handler` Lambda. Added an HTTP API Lambda proxy integration, `$default` route, and `aws_lambda_permission` for API Gateway invocation.
- The EventBridge Lambda target lacked the required Lambda resource-based invoke permission. Added `aws_lambda_permission` for the EventBridge rule.
- The summary implied that setting `ReportBatchItemFailures` alone was enough for partial batch handling. Clarified that the Lambda function must also return `batchItemFailures`.

## Review Notes
The snippets still assume supporting resources are defined elsewhere, including KMS keys, the Lambda execution role and policies, Lambda deployment bucket, API Gateway log group, SNS alert topic, and input variables. Terraform/OpenTofu CLI validation could not be run because neither `terraform`, `tofu`, nor a local HCL parser/formatter was installed in the environment.
