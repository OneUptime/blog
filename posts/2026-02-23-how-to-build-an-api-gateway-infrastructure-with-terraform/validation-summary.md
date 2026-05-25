# Validation Summary: How to Build an API Gateway Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS API Gateway HTTP APIs
- AWS Lambda integrations
- Amazon Cognito user pools
- API Gateway JWT authorizers
- ACM certificates
- Route 53 alias records
- AWS WAFv2
- Amazon CloudWatch Logs and metrics

## Sources Consulted
- HashiCorp Terraform AWS Provider: aws_apigatewayv2_stage - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_stage.html.markdown
- HashiCorp Terraform AWS Provider: aws_apigatewayv2_integration - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_integration.html.markdown
- HashiCorp Terraform AWS Provider: aws_apigatewayv2_route - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_route.html.markdown
- HashiCorp Terraform AWS Provider: aws_apigatewayv2_authorizer - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_authorizer.html.markdown
- HashiCorp Terraform AWS Provider: aws_apigatewayv2_domain_name - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_domain_name.html.markdown
- HashiCorp Terraform AWS Provider: aws_apigatewayv2_api_mapping - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/apigatewayv2_api_mapping.html.markdown
- HashiCorp Terraform AWS Provider: aws_lambda_permission - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_permission.html.markdown
- HashiCorp Terraform AWS Provider: aws_wafv2_web_acl_association - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/wafv2_web_acl_association.html.markdown
- AWS API Gateway HTTP APIs documentation - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api.html
- AWS API Gateway JWT authorizers for HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- AWS API Gateway HTTP API CloudWatch metrics - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-metrics.html
- AWS API Gateway HTTP API access log variables - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging-variables.html
- AWS API Gateway REST API metrics and dimensions - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-metrics-and-dimensions.html

## Issues Found
- The architecture overview said the post would build both HTTP API and REST API options, but the implementation only shows an API Gateway v2 HTTP API. Changed the bullet to "AWS API Gateway HTTP API".
- The architecture overview said "Lambda authorizer for authentication", but the implementation uses an API Gateway JWT authorizer backed by Cognito. Changed the bullet to "JWT authorizer for authentication".
- The Lambda integration omitted `integration_method`. Terraform documents that `integration_method` must be specified when the integration type is not `MOCK`. Added `integration_method = "POST"` to the Lambda proxy integration.
- The Lambda integration omitted permission for API Gateway to invoke the Lambda function. Added an `aws_lambda_permission` resource using the HTTP API stage `execution_arn` as the source ARN prefix.
- The WAF association example used `aws_apigatewayv2_stage.default.arn`, but Terraform documents direct WAFv2 Web ACL association for API Gateway stages as REST only, with HTTP APIs unsupported. Added a caveat that HTTP APIs should use CloudFront plus WAF, and changed the direct association example to a REST API stage ARN.

## Review Notes
- The HTTP API metric names `5xx` and `Latency`, and the `ApiId` dimension, match AWS HTTP API CloudWatch documentation.
- The access log context variables used in the HTTP API stage are documented for HTTP API access logs.
- The WAF section now shows only the REST API stage association resource. A future revision could add a full REST API stage example or a CloudFront distribution example for HTTP APIs.
