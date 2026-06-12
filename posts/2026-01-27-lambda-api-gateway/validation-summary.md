# Validation Summary: How to Use Lambda with API Gateway

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- AWS Lambda
- Amazon API Gateway REST APIs, HTTP APIs, and WebSocket APIs
- Lambda proxy integrations
- API Gateway mapping templates
- Lambda authorizers, JWT authorizers, and Cognito authorizers
- CORS
- API Gateway stages, canary deployments, and custom domains
- AWS SAM
- AWS CDK
- DynamoDB
- Cognito
- CloudWatch, X-Ray, and AWS WAF

## Sources Consulted
- AWS API Gateway: Choose between REST APIs and HTTP APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html
- AWS API Gateway: Lambda proxy integrations for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- AWS API Gateway: Lambda proxy integrations for HTTP APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- AWS API Gateway: Lambda authorizers for HTTP APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html
- AWS API Gateway: Request validation for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-request-validation.html
- AWS API Gateway: Usage plans and API keys for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- AWS API Gateway: Configure CORS for HTTP APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-cors.html
- AWS API Gateway: WebSocket APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api.html
- AWS API Gateway pricing: https://aws.amazon.com/api-gateway/pricing/
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS SAM CorsConfiguration: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-api-corsconfiguration.html
- AWS SAM Function resource: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS CDK Lambda Runtime API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- AWS CDK API Gateway module documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway-readme.html
- Serverless Framework HTTP API event documentation: https://www.serverless.com/framework/docs/providers/aws/events/http-api

## Issues Found
- The REST API vs HTTP API comparison listed API Gateway WebSocket support as "REST API only." API Gateway WebSocket APIs are a separate API type, so the table and selection guidance were corrected.
- The comparison described HTTP API resource policies as "Limited." Official AWS feature comparison lists resource policies for REST APIs and not HTTP APIs, so this was changed to "No."
- The Lambda proxy event example was presented generically, but it shows the REST API / payload format 1.0 shape. Added a note that HTTP API payload format 2.0 uses a different event structure.
- The REST API CORS JavaScript example combined `Access-Control-Allow-Credentials: true` with a wildcard origin fallback. Browsers reject credentialed CORS responses with wildcard origins, so the fallback was changed to a concrete example origin.
- The SAM and CDK examples used the deprecated `nodejs18.x` Lambda runtime and `NODEJS_18_X` CDK runtime constant. These were updated to Node.js 22, which is currently supported by AWS Lambda.
- The security best practice said HTTPS requires custom domains with ACM certificates. API Gateway default endpoints already use HTTPS, so the wording was corrected to distinguish default HTTPS endpoints from ACM-backed custom domains.
- The security best practice about resource policies was narrowed to REST APIs because HTTP APIs do not support API Gateway resource policies.

## Review Notes
The post is technically relevant and broadly accurate after the corrections. Future improvements could add a separate HTTP API payload format 2.0 event example and a request model in the CDK request validation example, but those are completeness improvements rather than blockers for technical correctness.
