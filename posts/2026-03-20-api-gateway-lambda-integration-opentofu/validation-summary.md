# Validation Summary: How to Set Up API Gateway Lambda Integration with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Lambda
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- Terraform AWS Provider syntax used by OpenTofu
- cURL

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/init/
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu lifecycle docs: https://opentofu.org/docs/v1.6/language/meta-arguments/lifecycle/
- AWS API Gateway Lambda proxy integration docs for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- AWS API Gateway Lambda proxy integration docs for HTTP APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- AWS API Gateway route docs for HTTP APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-routes.html
- AWS API Gateway ARN reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/arn-format-reference.html
- AWS API Gateway HTTP API logging docs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-logging.html
- AWS Lambda AddPermission API docs: https://docs.aws.amazon.com/lambda/latest/api/API_AddPermission.html
- Terraform AWS Provider docs for `aws_api_gateway_integration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_integration
- Terraform AWS Provider docs for `aws_api_gateway_deployment`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment
- Terraform AWS Provider docs for `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS Provider docs for `aws_apigatewayv2_stage`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage

## Issues Found
- The introduction said Lambda proxy integrations always require a structured `statusCode`/`headers`/`body` response. I corrected this because HTTP API Lambda proxy integrations using payload format `2.0` can return a simpler response and let API Gateway infer `statusCode`, `body`, and `content-type`.
- The REST API `aws_lambda_permission` example used `${aws_api_gateway_rest_api.main.execution_arn}/*/*`, which is too narrow for `ANY /{proxy+}` requests such as `/prod/users`. I changed it to `/*/*/*` so the permission covers stage, method, and resource path.
- The REST API deployment example relied on `depends_on` only. I replaced that with a `triggers` hash so OpenTofu will create a new API Gateway deployment when the proxied REST API resources change, which matches current provider guidance.
- The conclusion claimed `depends_on` should always be used for deployments and described `source_arn` scoping only in terms of stage and method. I updated that guidance to reflect current provider documentation and the full execute-api ARN shape.

## Review Notes
- The REST API example correctly handles proxied subpaths through `ANY /{proxy+}`. If the post later wants to handle the stage root path as well, it would need an additional method and integration on the root resource.
