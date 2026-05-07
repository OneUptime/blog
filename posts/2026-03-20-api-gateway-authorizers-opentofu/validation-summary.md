# Validation Summary: How to Create API Gateway Authorizers with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu CLI
- HCL
- AWS provider for OpenTofu
- Amazon API Gateway REST APIs
- AWS Lambda authorizers
- Amazon Cognito user pool authorizers
- AWS IAM

## Sources Consulted
- OpenTofu: Initializing Working Directories https://opentofu.org/docs/cli/init/
- OpenTofu: `tofu plan` https://opentofu.org/docs/cli/commands/plan/
- OpenTofu: `tofu apply` https://opentofu.org/docs/v1.11/cli/commands/apply/
- Terraform Registry: `aws_api_gateway_authorizer` https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_authorizer
- Amazon API Gateway: Use API Gateway Lambda authorizers https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html
- Amazon API Gateway API Reference: `CreateAuthorizer` https://docs.aws.amazon.com/apigateway/latest/api/API_CreateAuthorizer.html
- Amazon API Gateway: Control access to REST APIs using Amazon Cognito user pools as an authorizer https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html
- Amazon API Gateway: Integrate a REST API with an Amazon Cognito user pool https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-enable-cognito-user-pool.html
- Amazon Cognito: Scopes, M2M, and resource servers https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html
- RFC 6750: The OAuth 2.0 Authorization Framework: Bearer Token Usage https://www.rfc-editor.org/rfc/rfc6750

## Issues Found
- The token-authorizer regex accepted an empty bearer token and omitted valid RFC 6750 bearer-token characters such as `~`, `+`, `/`, and optional trailing `=` padding. I changed `identity_validation_expression` to `^Bearer [-A-Za-z0-9._~+/]+=*$` so the example matches bearer-token syntax more closely while remaining compatible with JWT-style tokens.
- The Cognito method example incorrectly described `authorization_scopes` as a way to restrict specific Cognito app clients. In API Gateway REST APIs, `authorization_scopes` enforces OAuth scopes on the access token. I updated the comment and changed the example scope to `photos/read`, which reflects Cognito's scope-based API authorization model.

## Review Notes
- The post is accurate for API Gateway REST APIs. HTTP APIs use different resources and settings, such as `aws_apigatewayv2_authorizer` and payload-format configuration.
