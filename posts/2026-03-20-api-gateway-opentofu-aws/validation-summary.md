# Validation Summary: How to Set Up an API Gateway with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS API Gateway HTTP APIs
- AWS Lambda
- Amazon CloudWatch Logs
- HCL
- Terraform AWS provider

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu `init` command: https://opentofu.org/docs/cli/commands/init/
- OpenTofu `plan` command: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` command: https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform AWS provider `aws_apigatewayv2_api`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_api
- Terraform AWS provider `aws_apigatewayv2_integration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration
- Terraform AWS provider `aws_apigatewayv2_route`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_route
- Terraform AWS provider `aws_apigatewayv2_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage
- Terraform AWS provider `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Create AWS Lambda proxy integrations for HTTP APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- Create routes for HTTP APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html
- Configure logging for HTTP APIs in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging.html
- Customize HTTP API access logs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging-variables.html
- Choose between REST APIs and HTTP APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html
- API Gateway use cases: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-overview-developer-experience.html
- API Gateway ARN reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/arn-format-reference.html

## Issues Found
- The description said the post covered "REST or HTTP API", but every resource in the article uses the API Gateway v2 HTTP API resource family (`aws_apigatewayv2_*`). I changed the description to say HTTP API only.
- The prerequisites said readers could use an existing Lambda function or backend service, but the code only configures a Lambda `AWS_PROXY` integration. I changed the prerequisite to an existing Lambda function.
- The integration example used `var.lambda_function_arn` for `integration_uri`. The provider documentation uses the Lambda invoke ARN pattern for API Gateway integration URIs, so I changed the example to `var.lambda_invoke_arn`.
- The conclusion said to consider REST APIs for request validation, authorizers, or usage plans. AWS documents that HTTP APIs support IAM, Lambda authorizers, and JWT authorization, so I removed `authorizers` from that list.

## Review Notes
- The Lambda permission scope, `source_arn = "${aws_apigatewayv2_api.main.execution_arn}/*/*"`, is broad but valid for allowing API Gateway to invoke the function from any stage and route. A narrower ARN would be a future least-privilege improvement, not a correctness fix.
- The provider constraint `~> 5.0` is older than the current AWS provider major version, but the resources and arguments used in the post are still valid in the current documentation.
- I could not run `tofu validate` or `tofu plan` locally because the `tofu` binary is not installed in this environment. The review and fixes were verified against the official OpenTofu, AWS, and AWS provider documentation instead.
