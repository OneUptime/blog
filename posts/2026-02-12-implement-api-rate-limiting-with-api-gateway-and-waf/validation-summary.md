# Validation Summary: How to Implement API Rate Limiting with API Gateway and WAF

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- AWS API Gateway REST APIs
- AWS CDK v2
- AWS WAFv2
- API Gateway usage plans and API keys
- Lambda authorizers
- DynamoDB atomic counters and TTL
- CloudWatch metrics and alarms
- JavaScript / TypeScript

## Sources Consulted
- AWS API Gateway throttling documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html
- AWS API Gateway usage plans and API keys documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-usage-plans.html
- AWS API Gateway API key source documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-api-key-source.html
- AWS CDK API Gateway construct library documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway-readme.html
- AWS WAF rate-based rule settings documentation: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-high-level-settings.html
- AWS WAF rate-based aggregation documentation: https://docs.aws.amazon.com/waf/latest/developerguide/waf-rule-statement-type-rate-based-aggregation-options.html
- AWS WAF ByteMatchStatement API reference: https://docs.aws.amazon.com/waf/latest/APIReference/API_ByteMatchStatement.html
- AWS CloudFormation AWS::WAFv2::WebACLAssociation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-wafv2-webaclassociation.html
- AWS API Gateway Lambda authorizer output documentation: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-lambda-authorizer-output.html
- AWS WAF metrics and dimensions documentation: https://docs.aws.amazon.com/waf/latest/developerguide/waf-metrics.html
- Amazon DynamoDB UpdateItem API reference: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_UpdateItem.html

## Issues Found
- API Gateway throttling was described as a hard sustained ceiling. Updated the explanation to note that API Gateway throttles and quotas are best-effort targets, matching AWS documentation.
- The CDK `methodOptions` keys used `POST/auth/login` and `GET/products`, which do not match the documented API Gateway method setting key shape. Updated them to `/auth/login/POST` and `/products/GET`.
- The Enterprise usage plan was created but no API key was assigned to it. Added an enterprise API key and associated it with the Enterprise usage plan.
- The WAF section implied all API Gateway throttling is per API key and framed WAF as DDoS protection. Clarified that usage plan throttling is per API key, stage/method throttling is separate, and WAF helps reduce application-layer abuse.
- The WAF bad user-agent rule lowercased the inspected header but searched for `BadBot`, making the match case-sensitive against the wrong string. Changed `searchString` to `badbot`.
- The Lambda authorizer rate limiter did not mention authorizer caching. Added a note to disable caching so requests do not bypass the per-request counter update.
- The Lambda authorizer looked up only lowercase `x-api-key` and directly accessed `requestContext.identity.sourceIp`. Added a common `X-API-Key` fallback and optional chaining for `identity`.
- The rate limit response header example used integration response mapping against authorizer context in a way that would not work for a Lambda proxy integration. Replaced it with a Lambda proxy response that emits the headers from `event.requestContext.authorizer`.
- The WAF CloudWatch alarm dimensions used the construct/rule names instead of metric names and omitted the required `Region` dimension for regional resources. Updated dimensions to use `Region`, `api-waf-metrics`, and `rate-limit-per-ip`.

## Review Notes
The examples are still illustrative snippets and assume surrounding CDK declarations such as Lambda handlers, imports, and tables exist. API Gateway usage plan quotas and throttles should not be treated as cost-control or security authorization boundaries because AWS documents them as best-effort.
