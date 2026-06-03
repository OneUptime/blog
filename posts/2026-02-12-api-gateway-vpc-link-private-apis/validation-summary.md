# Validation Summary: How to Set Up API Gateway with VPC Link for Private APIs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- API Gateway VPC Links V2
- Application Load Balancers and Network Load Balancers
- AWS Cloud Map private integrations
- AWS CLI
- AWS CloudFormation
- AWS CDK v2
- Amazon ECS Fargate
- Amazon VPC interface endpoints and private REST APIs

## Sources Consulted
- AWS API Gateway Developer Guide: Set up VPC links V2 in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-vpc-links-v2.html
- AWS API Gateway Developer Guide: Set up a private integration - https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-private-integration.html
- AWS API Gateway Developer Guide: Create private integrations for HTTP APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-private.html
- AWS API Gateway Developer Guide: Private integration using VPC links V1 (legacy) - https://docs.aws.amazon.com/apigateway/latest/developerguide/vpc-links-v1.html
- AWS CLI Command Reference: apigateway put-integration - https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-integration.html
- AWS CLI Command Reference: apigatewayv2 create-integration - https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/create-integration.html
- AWS API Gateway Developer Guide: Create a private API - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-api-create.html
- AWS CDK API Reference: aws_apigatewayv2 VpcLink - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigatewayv2.VpcLink.html
- AWS CDK API Reference: HttpAlbIntegration - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigatewayv2_integrations.HttpAlbIntegration.html
- AWS CDK API Reference: HttpAlbIntegrationProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigatewayv2_integrations.HttpAlbIntegrationProps.html

## Issues Found
- Updated the REST API guidance from legacy VPC Links V1 to the current VPC Links V2 model. The original post said REST APIs require NLB-backed VPC Links and used `aws apigateway create-vpc-link --target-arns`; AWS now documents VPC Links V2 as supported and recommended for REST APIs, with ALB or NLB private integrations.
- Updated the REST API integration command to include `--integration-target` with a load balancer listener ARN, matching current AWS CLI support for REST private integrations with VPC Links V2.
- Corrected the HTTP API section after the REST change. The original contrast said REST API VPC Links point to an NLB, which was no longer true after moving the REST example to VPC Links V2.
- Added the missing `aws apigatewayv2 create-route` command after creating the HTTP API integration, because creating the integration alone does not attach it to a route.
- Fixed the CDK security group snippet by defining `albSecurityGroup` before using it.
- Corrected the resource policy condition key from `aws:sourceVpce` to the documented `aws:SourceVpce` spelling.
- Corrected the timeout guidance. API Gateway's default integration timeout is 29 seconds; REST APIs can increase it above 29 seconds for Regional and private APIs, while HTTP API private integration timeouts are limited to 50 milliseconds through 29 seconds.
- Updated the troubleshooting note for VPC Links stuck in `PENDING` so it reflects VPC Links V2 ENI creation rather than legacy NLB target health.

## Review Notes
The examples use placeholder ARNs, subnet IDs, security group IDs, API IDs, and container image names. Those are appropriate for a tutorial, but readers must replace them with real resources in the same AWS account and supported Availability Zones.
