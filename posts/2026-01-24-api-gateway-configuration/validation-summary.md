# Validation Summary: How to Handle API Gateway Configuration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- API gateway architecture
- Kong Gateway declarative configuration
- Kong Gateway plugins for rate limiting, authentication, transformations, health checks, and logging
- NGINX reverse proxy, rate limiting, connection limiting, and auth subrequests
- AWS API Gateway OpenAPI extensions
- Terraform AWS provider resources for API Gateway
- Mermaid diagrams
- curl and jq troubleshooting commands

## Sources Consulted
- Kong Gateway Rate Limiting plugin documentation: https://developer.konghq.com/plugins/rate-limiting/
- Kong Gateway Request Transformer plugin documentation: https://developer.konghq.com/plugins/request-transformer/
- Kong Gateway Response Transformer plugin documentation: https://developer.konghq.com/plugins/response-transformer/
- Kong Gateway JWT plugin documentation: https://developer.konghq.com/plugins/jwt/
- Kong Gateway Key Auth plugin documentation: https://developer.konghq.com/plugins/key-auth/
- Kong Gateway OAuth 2.0 plugin documentation: https://developer.konghq.com/plugins/oauth2/
- Kong Gateway health checks and circuit breakers documentation: https://developer.konghq.com/gateway/traffic-control/health-checks-circuit-breakers/
- NGINX auth_request module documentation: https://nginx.org/en/docs/http/ngx_http_auth_request_module.html
- NGINX limit_req module documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- AWS API Gateway x-amazon-apigateway-integration documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions-integration.html
- AWS API Gateway integration requestParameters documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-swagger-extensions-integration-requestParameters.html
- Terraform AWS provider aws_api_gateway_rest_api documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_rest_api
- Terraform AWS provider aws_api_gateway_stage documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage
- Terraform AWS provider aws_api_gateway_deployment documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_deployment

## Issues Found
- The NGINX error response was marked as JSON but included a JavaScript-style comment, which would make the file invalid JSON. Removed the inline comment from the JSON block.
- The AWS API Gateway OpenAPI request parameter mapping used `context.requestId`. Changed it to `$context.requestId`, which is the documented context-variable syntax for integration request parameter mappings.
- The Kong request and response transformer examples used unsupported function-style template values, `$(uuid)` and `$(latency)`. Replaced them with static headers supported by the transformer plugins.
- The Kong circuit breaker section used a `circuit-breaker` plugin and configuration fields that are not part of Kong Gateway's documented bundled plugin set. Replaced the example with passive upstream health checks, which Kong documents as its circuit breaker behavior.

## Review Notes
The snippets are illustrative and still assume surrounding infrastructure exists, such as Kong Services/Consumers, Redis, an auth service, AWS VPC Link and load balancer resources, CloudWatch permissions, and backend DNS names. Kong's OAuth 2.0 plugin also requires HTTPS or explicit insecure test configuration in real deployments.
