# Validation Summary: How to Configure AWS API Gateway with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS API Gateway HTTP APIs
- AWS API Gateway REST APIs
- API Gateway custom domain names
- AWS CLI
- AWS Lambda
- Terraform
- IPv6 / dualstack networking on AWS

## Sources Consulted
- AWS API Gateway Developer Guide: HTTP API IP address types - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-ip-address-type.html
- AWS API Gateway Developer Guide: REST API IP address types - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-ip-address-type.html
- AWS API Gateway Developer Guide: Change the IP address type of a REST API - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-ip-address-type-change.html
- AWS API Gateway Developer Guide: Custom domain name IP address types - https://docs.aws.amazon.com/apigateway/latest/developerguide/rest-custom-domain-ip-address-type.html
- AWS API Gateway Developer Guide: Edge-optimized custom domain names - https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-edge-optimized-custom-domain-name.html
- AWS API Reference: EndpointConfiguration - https://docs.aws.amazon.com/apigateway/latest/api/API_EndpointConfiguration.html
- AWS CLI Command Reference: `apigatewayv2 create-api` - https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/create-api.html
- AWS CLI Command Reference: `apigateway create-rest-api` - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-rest-api.html
- AWS CLI Command Reference: `apigateway create-domain-name` - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-domain-name.html
- AWS API Gateway Developer Guide: Lambda proxy integrations for HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html

## Issues Found
- The post said REST APIs only gain IPv6 through CloudFront-backed custom domains. This is no longer correct. AWS now documents native dualstack IP address support for REST APIs themselves, so the REST section was rewritten to use `create-rest-api` and `update-rest-api` with `ipAddressType=dualstack`.
- The post instructed readers to find and modify the API Gateway-managed CloudFront distribution directly. That is incorrect for API Gateway edge-optimized custom domains. The post was updated to configure dualstack on the API Gateway custom domain name with `create-domain-name` or `update-domain-name` instead.
- The Lambda example used only `requestContext.identity.sourceIp`, which matches REST APIs and HTTP API payload format `1.0`, but not the default HTTP API payload format `2.0`. The example was updated to read `requestContext.http.sourceIp` for HTTP APIs and fall back to `requestContext.identity.sourceIp` for REST APIs / payload `1.0`.
- The description, introduction, and conclusion were updated to reflect the current AWS model: HTTP APIs, REST APIs, and API Gateway custom domain names all support dualstack IP address types.

## Review Notes
- AWS documents that when switching an API or custom domain from IPv4 to dualstack, any resource policies, IP allowlists, or source-IP-based restrictions should be reviewed to include IPv6 ranges as needed.
- API Gateway also documents that an API and its mapped custom domain name can use different IP address types. That is valid, but it can affect reachability if the default execute-api endpoint is disabled.
