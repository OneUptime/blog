# Validation Summary: How to Use API Gateway Custom Domain Names

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- API Gateway custom domain names
- AWS Certificate Manager
- Amazon Route 53 alias records
- AWS CLI
- AWS CDK v2
- AWS Lambda
- Mutual TLS
- AWS WAF

## Sources Consulted
- AWS CLI Command Reference: apigateway create-domain-name - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-domain-name.html
- AWS CLI Command Reference: apigateway create-base-path-mapping - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-base-path-mapping.html
- Amazon API Gateway Developer Guide: Set up a Regional custom domain name - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-regional-api-custom-domain-create.html
- Amazon API Gateway Developer Guide: Custom domain names for HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-custom-domain-names.html
- Amazon API Gateway API Reference: DomainName - https://docs.aws.amazon.com/apigateway/latest/api/API_DomainName.html
- AWS General Reference: Amazon API Gateway endpoints and quotas - https://docs.aws.amazon.com/general/latest/gr/apigateway.html
- AWS CDK API Reference: aws_apigateway.DomainNameProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.DomainNameProps.html
- AWS CDK API Reference: aws_apigatewayv2.DomainNameProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigatewayv2.DomainNameProps.html
- AWS CDK API Reference: aws_route53_targets.ApiGateway - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_route53_targets.ApiGateway.html
- AWS CDK API Reference: ApiGatewayv2DomainProperties - https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/services/route53/targets/ApiGatewayv2DomainProperties.html
- Amazon API Gateway Developer Guide: Use AWS WAF to protect your REST APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-control-access-aws-waf.html

## Issues Found
- The AWS CLI examples used REST API Gateway commands while the post also mentioned HTTP APIs. I clarified that those CLI examples are for REST APIs and that HTTP API custom domains use API Gateway v2 configuration, which the post covers later with CDK.
- The certificate request example used `us-east-1` without reminding readers that regional endpoints need certificates in the API's region. I added a note to use the API region for regional endpoints and `us-east-1` for edge-optimized endpoints.
- The DNS lookup command returned only `regionalDomainName`, while a Route 53 alias record also needs the API Gateway hosted zone ID. I changed the query to return both `regionalDomainName` and `regionalHostedZoneId`.
- The WAF statement implied direct AWS WAF support for all regional API Gateway endpoint types. I narrowed it to regional REST API stages, which are the directly supported API Gateway resource for AWS WAF association.

## Review Notes
The remaining examples are technically valid for the REST API and CDK v2 patterns shown. The Route 53 hosted zone ID example is correct for API Gateway regional endpoints in `us-east-1`, but readers should still use the value returned for their own custom domain and region.
