# Validation Summary: How to Create an HTTP API Gateway v2 with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS API Gateway v2 HTTP APIs
- AWS Lambda
- Amazon Cognito JWT authorizers
- Amazon CloudWatch Logs and metrics
- Amazon Route 53
- AWS Certificate Manager

## Sources Consulted
- AWS provider docs for `aws_apigatewayv2_api`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api
- AWS provider docs for `aws_apigatewayv2_integration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration
- AWS provider docs for `aws_apigatewayv2_route`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_route
- AWS provider docs for `aws_apigatewayv2_authorizer`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_authorizer
- AWS provider docs for `aws_apigatewayv2_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage
- AWS provider docs for `aws_apigatewayv2_domain_name`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_domain_name
- AWS provider docs for `aws_apigatewayv2_api_mapping`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api_mapping
- AWS provider docs for `aws_cognito_user_pool` and `aws_cognito_user_pool_client`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_client
- AWS docs for JWT authorizers on HTTP APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- AWS docs for HTTP API logging: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging.html
- AWS docs for HTTP API stages: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-stages.html
- AWS docs comparing HTTP APIs and REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html
- AWS X-Ray docs for API Gateway: https://docs.aws.amazon.com/xray/latest/devguide/xray-services-apigateway.html

## Issues Found
- The JWT authorizer example used `https://api.example.com` as the audience while the issuer was an Amazon Cognito user pool. For Cognito-backed JWT authorization, the audience should match the user pool client ID. I changed `audience` to `aws_cognito_user_pool_client.main.id` and changed `issuer` to `https://${aws_cognito_user_pool.main.endpoint}` so the example stays region-correct.
- The `access_log_settings` block in the stage example was incomplete. The AWS provider requires a `format` when access logging is configured, and AWS requires the format to include at least `$context.requestId`. I added a valid JSON log format.
- The best-practices note that said to prefer HTTP APIs over REST APIs for all new projects was too broad. AWS recommends HTTP APIs only when you do not need REST-only features such as API keys, private endpoints, request validation, or AWS WAF integration. I narrowed the wording to match the official guidance.
- The best-practices note recommending X-Ray tracing for HTTP APIs was incorrect. AWS documents X-Ray support for API Gateway REST APIs, not HTTP APIs. I replaced that guidance with CloudWatch metrics for latency visibility on HTTP APIs.

## Review Notes
- AWS recommends using `authorization_scopes` on JWT-protected HTTP API routes when you want to require access tokens with specific scopes rather than accepting any token that matches the configured issuer and audience.
- For named HTTP API stages such as `production`, the stage name is part of the invoke URL. Only the `$default` stage is served from the API root path.
