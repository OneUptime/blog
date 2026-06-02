# Validation Summary: How to Migrate from REST API to HTTP API on API Gateway

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- AWS Lambda proxy integrations
- AWS CLI
- AWS CloudFormation
- Amazon Route 53
- Amazon Cognito and JWT authorizers

## Sources Consulted
- AWS API Gateway Developer Guide: Choose between REST APIs and HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html
- AWS API Gateway Developer Guide: Lambda proxy integrations for HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- AWS API Gateway Developer Guide: CORS for HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html
- AWS API Gateway Developer Guide: HTTP API quotas - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-quotas.html
- AWS API Gateway Developer Guide: REST API quotas - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-execution-service-limits-table.html
- AWS CLI Command Reference: apigatewayv2 create-authorizer - https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/create-authorizer.html
- AWS SDK Code Examples: API Gateway V2 CLI examples - https://docs.aws.amazon.com/code-library/latest/ug/cli_2_apigatewayv2_code_examples.html
- AWS CloudFormation Template Reference: AWS::ApiGatewayV2::Integration - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-apigatewayv2-integration.html
- Amazon Route 53 API Reference: AliasTarget - https://docs.aws.amazon.com/Route53/latest/APIReference/API_AliasTarget.html
- AWS API Gateway pricing - https://aws.amazon.com/api-gateway/pricing/
- AWS Compute Blog: Building faster, lower cost, better APIs - HTTP APIs now generally available - https://aws.amazon.com/blogs/compute/building-better-apis-http-apis-now-generally-available/

## Issues Found
- Corrected the feature table from "Maximum integrations per API" to "Resources/routes per API" because REST APIs document a 300 resources-per-API quota, while HTTP APIs document 300 routes and 300 integrations per API.
- Corrected CORS support. REST APIs and HTTP APIs both support CORS configuration; HTTP APIs additionally provide automatic preflight handling when CORS is configured.
- Corrected authorization wording. REST APIs do not have native JWT authorizers, while HTTP APIs do; both support IAM-style authorization options and Lambda authorizers, with Cognito represented through the appropriate authorizer type.
- Corrected logging and throttling wording to distinguish shared access logs/metrics and account/route throttling from REST-only execution logs and per-client usage-plan throttling.
- Corrected the REST-only feature list. HTTP APIs support mutual TLS authentication and request/response parameter mapping, but not REST API-style VTL body mapping templates or backend client certificates.
- Added Lambda invoke permission to the boto3 migration script because a new HTTP API needs permission to invoke the Lambda function; existing REST API permissions do not automatically authorize the new API.
- Corrected Route 53 rollout guidance. Weighted alias records for API Gateway custom domains must target the custom domain's API Gateway domain name and hosted zone ID, not a default API invoke URL, and weighted rollout requires separate custom-domain/proxy targets.
- Corrected the CloudFormation Lambda integration to include `IntegrationMethod: POST`, a Lambda invoke URI in the API Gateway format, and an `AWS::Lambda::Permission` resource.

## Review Notes
The migration script remains an illustrative starting point rather than a complete production migration tool. Real migrations may need pagination, duplicate Lambda permission handling, non-Lambda integrations, authorizer recreation, route-level settings, custom domain mappings, and access log configuration.
