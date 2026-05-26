# Validation Summary: How to Create API Gateway WebSocket APIs in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS API Gateway v2 WebSocket APIs
- AWS Lambda
- Amazon DynamoDB
- AWS IAM
- Amazon CloudWatch Logs
- AWS Certificate Manager
- Amazon Route 53
- Node.js Lambda runtimes
- wscat

## Sources Consulted
- AWS API Gateway Developer Guide: Create routes for WebSocket APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-develop-routes.html
- AWS API Gateway Developer Guide: Use @connections commands in your backend service - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-how-to-call-websocket-api-connections.html
- AWS API Gateway Developer Guide: Deploy WebSocket APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-set-up-websocket-deployment.html
- AWS Lambda Developer Guide: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Terraform Registry: aws_apigatewayv2_stage - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage
- Terraform Registry: aws_apigatewayv2_api - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api
- Terraform Registry: aws_apigatewayv2_integration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration
- Terraform Registry: aws_apigatewayv2_route - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_route
- Terraform Registry: aws_lambda_function - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- npm package metadata for wscat, checked with `npm view wscat version`

## Issues Found
- The Lambda examples used the `nodejs20.x` runtime. AWS lists Node.js 20 as a deprecated Lambda runtime as of April 30, 2026, while Node.js 22 remains supported. I changed all four Lambda function snippets from `nodejs20.x` to `nodejs22.x`.

## Review Notes
Terraform was not installed in the workspace, so I could not run `terraform validate`. I reviewed the HCL snippets against the Terraform AWS provider documentation and AWS service documentation instead. The post omits supporting resources such as `archive_file` data sources, Lambda handler source code, ACM certificate creation, and Route 53 zone lookup, but the snippets reference those as surrounding infrastructure rather than claiming to be a standalone Terraform module.
