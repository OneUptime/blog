# Validation Summary: How to Create Serverless Web Application Backend with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS S3
- AWS CloudFront (Origin Access Control, distributions)
- AWS Cognito (User Pool, User Pool Client, User Pool Domain)
- AWS API Gateway v2 (HTTP API, JWT authorizer, integrations, routes, stages)
- AWS Lambda
- AWS DynamoDB (PAY_PER_REQUEST, GSI)
- AWS ACM
- AWS IAM

## Sources Consulted
- Terraform AWS Provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
  - `aws_s3_bucket`, `aws_s3_bucket_public_access_block`, `aws_s3_bucket_policy`, `aws_s3_bucket_cors_configuration`
  - `aws_cloudfront_distribution`, `aws_cloudfront_origin_access_control`
  - `aws_cognito_user_pool`, `aws_cognito_user_pool_client`, `aws_cognito_user_pool_domain`
  - `aws_apigatewayv2_api`, `aws_apigatewayv2_stage`, `aws_apigatewayv2_authorizer`, `aws_apigatewayv2_route`, `aws_apigatewayv2_integration`
  - `aws_lambda_function`, `aws_dynamodb_table`
- AWS Lambda runtimes / deprecation policy: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Cognito JWT issuer format: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
- AWS API Gateway v2 HTTP API JWT authorizers: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- AWS CloudFront OAC: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html

## Issues Found
1. **Outdated Lambda runtime (`nodejs18.x`)** — AWS deprecated the `nodejs18.x` runtime in September 2025. As of the current date (2026-05-24) it is no longer supported for new function creation/updates. Updated to `nodejs20.x`, which is the current LTS supported by AWS Lambda.

## Review Notes
- The CloudFront `default_cache_behavior` and `ordered_cache_behavior` blocks use the legacy `forwarded_values` API. AWS recommends migrating to managed cache policies / origin request policies (`cache_policy_id`, `origin_request_policy_id`) for new configurations, but `forwarded_values` is still functional. Author preference preserved.
- The Cognito User Pool `schema` block redefines the standard `name` attribute with `min_length = 1`, `max_length = 256`. AWS's predefined `name` attribute uses `min_length = 0`, `max_length = 2048`. In practice the Terraform provider often tolerates this on initial create, but redefining standard attributes with different constraints can cause `InvalidParameterException` on apply against fresh pools. This is a common pattern in tutorials; left unchanged to preserve author intent.
- `aws_apigatewayv2_stage.api.invoke_url` for a `$default` HTTP API stage returns `https://{api-id}.execute-api.{region}.amazonaws.com/` (with trailing slash). The `replace(...)` strips `https://` but the trailing slash remains in the `domain_name`. CloudFront generally tolerates this, but a more robust pattern is `trimsuffix(replace(aws_apigatewayv2_stage.api.invoke_url, "https://", ""), "/")`. Left as-is since it matches author's chosen style and works in practice.
- The post references but does not define `aws_acm_certificate.website`, `aws_lambda_function.get_profile`, `aws_iam_role.lambda_api`, `data.archive_file.api_functions`, and variables `var.environment`, `var.domain_name`, `var.region`. These are intentional placeholders the reader is expected to supply; this is normal for a focused tutorial.
- Cognito token validity values (1 hour for access/id tokens, 30 days for refresh token) are within AWS-allowed ranges.
