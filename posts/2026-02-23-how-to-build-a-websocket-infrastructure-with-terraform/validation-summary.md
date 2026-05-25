# Validation Summary: How to Build a WebSocket Infrastructure with Terraform

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Terraform
- AWS API Gateway WebSocket APIs
- AWS Lambda
- Amazon DynamoDB
- Amazon SQS
- Amazon CloudWatch
- AWS IAM

## Sources Consulted
- AWS API Gateway WebSocket route documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-develop-routes.html
- AWS API Gateway WebSocket CloudWatch metrics documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-logging.html
- AWS Lambda supported runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda SQS event source mapping documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-sqs-configure.html
- AWS Lambda API Gateway permissions documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
- AWS API Gateway Management API documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-how-to-call-websocket-api-connections.html
- Terraform AWS provider `aws_apigatewayv2_api`, `aws_apigatewayv2_stage`, `aws_apigatewayv2_integration`, `aws_apigatewayv2_route`, `aws_lambda_function`, `aws_dynamodb_table`, `aws_sqs_queue`, and `aws_cloudwatch_metric_alarm` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The Lambda examples used `nodejs20.x`, which is no longer listed as a supported Lambda runtime in the current AWS Lambda runtime documentation. Updated all Lambda function examples to `nodejs24.x`.
- The shared Lambda IAM policy did not grant the broadcast Lambda permission to read from the SQS queue used by the event source mapping, so the trigger would fail. Added `sqs:ReceiveMessage`, `sqs:DeleteMessage`, and `sqs:GetQueueAttributes`, plus `sqs:SendMessage` for the message buffering flow described in the post.
- The SQS queue visibility timeout was equal to the broadcast Lambda timeout. AWS requires the function timeout to be less than or equal to the queue visibility timeout and recommends at least six times the function timeout for SQS event sources. Updated the visibility timeout from 60 seconds to 360 seconds.
- The SQS redrive policy used `maxReceiveCount = 3`; AWS recommends at least 5 for Lambda SQS event sources. Updated it to 5.
- The "message errors" CloudWatch alarm used `MessageCount`, which counts WebSocket API traffic rather than errors. Updated it to `IntegrationError`, a supported WebSocket API error metric.

## Review Notes
Terraform is not installed in this environment, so I could not run `terraform validate`. The HCL was reviewed statically against the AWS provider and AWS service documentation. The post mentions a custom domain with TLS in the architecture list, but it does not include Terraform resources for an API Gateway domain name, API mapping, or ACM certificate; that is a completeness gap rather than a correctness issue in the included snippets.
