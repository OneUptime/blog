# Validation Summary: How to Use API Gateway Resource Policies for IP Whitelisting

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon API Gateway REST APIs
- API Gateway resource policies
- AWS IAM policy language and condition keys
- AWS CLI
- AWS CloudFormation
- Terraform AWS provider
- Python boto3
- AWS Systems Manager Parameter Store

## Sources Consulted
- Amazon API Gateway Developer Guide: Control access to a REST API with API Gateway resource policies - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-resource-policies.html
- Amazon API Gateway Developer Guide: API Gateway resource policy examples - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-resource-policies-examples.html
- Amazon API Gateway Developer Guide: How API Gateway resource policies affect authorization workflow - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-authorization-flow.html
- Amazon API Gateway Developer Guide: AWS condition keys that can be used in API Gateway resource policies - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-resource-policies-aws-condition-keys.html
- Amazon API Gateway Developer Guide: Create and attach an API Gateway resource policy to an API - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-resource-policies-create-attach.html
- AWS CLI Command Reference: apigateway update-rest-api - https://docs.aws.amazon.com/cli/latest/reference/apigateway/update-rest-api.html
- AWS CLI Command Reference: apigateway create-deployment - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-deployment.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::RestApi - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-restapi.html
- Terraform Registry: aws_api_gateway_rest_api_policy - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_rest_api_policy
- Boto3 API Reference: APIGateway.Client.update_rest_api - https://docs.aws.amazon.com/boto3/latest/reference/services/apigateway/client/update_rest_api.html
- Boto3 API Reference: APIGateway.Client.create_deployment - https://docs.aws.amazon.com/boto3/latest/reference/services/apigateway/client/create_deployment.html
- Boto3 API Reference: SSM.Client.get_parameter - https://docs.aws.amazon.com/boto3/latest/reference/services/ssm/client/get_parameter.html

## Issues Found
- The post said resource policies are evaluated before any authorizer or authorization mechanism. AWS documents different authorization workflows depending on method authorization type, with pre-auth explicit-deny behavior for Lambda authorizers and different handling for IAM and Cognito. Updated the wording to avoid the overbroad claim while preserving the point that resource policies can block unwanted requests before backend integration.
- The public `aws:SourceIp` example included `10.0.0.0/8`, which is misleading for a public API because callers normally appear from public source addresses; for private APIs AWS documents `aws:VpcSourceIp` when filtering on the original requester IP. Replaced the RFC1918 CIDR with an IPv6 documentation prefix example.
- The VPC and VPC endpoint examples used lowercase `aws:sourceVpc` and `aws:sourceVpce`. Updated them to the documented condition key names `aws:SourceVpc` and `aws:SourceVpce`.
- The combined-condition example claimed to allow access only during business hours, but the policy used absolute date comparisons and represented a fixed UTC time window, not recurring business hours. Updated the explanatory sentence.
- The troubleshooting note about CloudFront was too absolute for all API Gateway endpoint paths. Reworded it to tell readers to test and confirm the source address API Gateway receives when using their own CloudFront distribution.

## Review Notes
The AWS CLI and boto3 method names and parameter shapes are current. The post correctly limits the discussion to API Gateway REST APIs; HTTP APIs use API Gateway v2 resources and have different tooling.
