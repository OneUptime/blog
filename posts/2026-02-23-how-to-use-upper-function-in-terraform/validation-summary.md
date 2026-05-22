# Validation Summary: How to Use the upper Function in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HCL
- Terraform string functions
- AWS Lambda
- Amazon S3 lifecycle configuration
- Amazon API Gateway HTTP APIs

## Sources Consulted
- Terraform `upper` function documentation: https://developer.hashicorp.com/terraform/language/functions/upper
- Terraform `replace` function documentation: https://developer.hashicorp.com/terraform/language/functions/replace
- Terraform `title` function documentation: https://developer.hashicorp.com/terraform/language/functions/title
- Terraform built-in functions overview: https://developer.hashicorp.com/terraform/language/functions
- AWS provider `aws_s3_bucket_lifecycle_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_lifecycle_configuration
- AWS provider `aws_apigatewayv2_route` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_route
- Amazon API Gateway HTTP API route documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html

## Issues Found
- The Lambda example described `LOG_LEVEL` as a CloudWatch log level and implied it was an AWS resource property. Lambda environment variables are application-defined key/value pairs, so the section was changed to describe application configuration values and application log levels.
- The API Gateway HTTP API example used `/orders/*` as a route path. AWS HTTP API greedy path variables use the `{proxy+}` syntax, so the example was changed to `/orders/{proxy+}`.
- The output formatting example used `length(aws_instance.app)` for a singleton resource, which would not be a reliable instance count. The output was changed to reference `aws_instance.app.id`.

## Review Notes
Terraform CLI is not installed in the local environment, so examples were reviewed against official documentation rather than executed with `terraform console` or `terraform validate`.
