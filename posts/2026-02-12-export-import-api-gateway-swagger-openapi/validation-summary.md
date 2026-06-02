# Validation Summary: How to Export and Import API Gateway Swagger/OpenAPI Definitions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS API Gateway REST APIs
- AWS CLI
- OpenAPI 3.0 / Swagger 2.0
- API Gateway OpenAPI extensions
- Python / boto3
- GitHub Actions
- Redocly CLI

## Sources Consulted
- AWS CLI Command Reference: get-export: https://docs.aws.amazon.com/cli/latest/reference/apigateway/get-export.html
- AWS CLI Command Reference: import-rest-api: https://docs.aws.amazon.com/cli/latest/reference/apigateway/import-rest-api.html
- AWS CLI Command Reference: put-rest-api: https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-rest-api.html
- AWS CLI Command Reference: create-deployment: https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-deployment.html
- Amazon API Gateway Developer Guide: Develop REST APIs using OpenAPI: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-import-api.html
- Amazon API Gateway Developer Guide: Export a REST API from API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-export-api.html
- Amazon API Gateway Developer Guide: Import an OpenAPI file to update an existing API definition: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-import-api-update.html
- Amazon API Gateway Developer Guide: OpenAPI extensions for API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions.html
- Amazon API Gateway Developer Guide: x-amazon-apigateway-integration object: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions-integration.html
- Amazon API Gateway Developer Guide: x-amazon-apigateway-request-validators object: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions-request-validators.html
- Boto3 API Gateway client get_export documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/apigateway/client/get_export.html
- Boto3 API Gateway client import_rest_api documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/apigateway/client/import_rest_api.html
- Redocly CLI lint documentation: https://redocly.com/docs/cli/commands/lint
- OneUptime linked blog post: https://oneuptime.com/blog/post/2026-02-06-canary-deployment-monitoring-opentelemetry/view

## Issues Found
- The post initially said REST API exports include integrations and authorizers by default. AWS documents these as API Gateway extensions, so I clarified that the standard export includes the OpenAPI representation and that AWS-specific settings require extensions.
- The extensions explanation implied `extensions=apigateway` captures all API Gateway-specific extensions, including authorizers. AWS documents `extensions=authorizers` separately for `x-amazon-apigateway-authorizer`, so I updated the wording.
- The sample exported OpenAPI file referenced `#/components/schemas/OrderResponse` without defining it. I added a minimal `OrderResponse` schema so the example is internally consistent.
- The merge-mode explanation said it only adds resources and methods. AWS documents that imported conflicting method definitions override existing method definitions, so I corrected the description.
- The direct-import OpenAPI JSON used CloudFormation `Fn::Sub` intrinsic functions inside the integration URI. That is suitable in a CloudFormation/SAM template body, but not for direct `aws apigateway import-rest-api` import. I replaced those values with literal API Gateway Lambda integration ARNs.
- The cross-account replication script was described as the full replication workflow, but it only imports the API definition and does not create target Lambda functions, Lambda invoke permissions, or deployment resources. I changed the wording to "basic" workflow and added a note about target Lambda functions and permissions.
- The GitHub Actions example used `@apidevtools/swagger-cli`, which is deprecated/abandoned. I replaced it with `npx @redocly/cli@latest lint api/openapi.yaml`, matching current Redocly CLI documentation.

## Review Notes
The post focuses on REST APIs using the `apigateway` AWS CLI namespace. HTTP APIs use the `apigatewayv2` namespace and different export/import behavior, but that is outside the scope of this post.
