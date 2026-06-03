# Validation Summary: How to Use API Gateway Private APIs with VPC Endpoints

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon API Gateway REST APIs
- API Gateway private APIs
- Amazon VPC interface endpoints
- AWS PrivateLink
- AWS CLI
- AWS CloudFormation
- AWS Lambda proxy integration
- Python HTTP clients

## Sources Consulted
- Amazon API Gateway: Private REST APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-apis.html
- Amazon API Gateway: Create a private API - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-api-create.html
- Amazon API Gateway: Invoke a private API - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-private-api-test-invoke-url.html
- Amazon API Gateway: Create and attach an API Gateway resource policy to an API - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-resource-policies-create-attach.html
- Amazon API Gateway: API Gateway resource policy examples - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-resource-policies-examples.html
- AWS CLI Command Reference: apigateway create-rest-api - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-rest-api.html
- AWS CLI Command Reference: apigateway put-integration - https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-integration.html
- AWS CloudFormation: AWS::ApiGateway::RestApi EndpointConfiguration - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-apigateway-restapi-endpointconfiguration.html
- AWS CloudFormation: AWS::Lambda::Permission - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-permission.html

## Issues Found
- The post said private APIs have no public endpoint at all. AWS documents endpoint-specific public DNS hostnames for private API invocation, so I changed this to say there is no publicly reachable invoke endpoint.
- The troubleshooting section described private APIs as strictly VPC-only. AWS documents Direct Connect and other private network access patterns into the VPC, so I changed that wording to focus on public internet access.
- The `create-rest-api` example omitted `ipAddressType=dualstack`. Current AWS documentation states private REST APIs support only dualstack, so I added it to the CLI and CloudFormation examples.
- The resource policy examples used `aws:sourceVpce`. I updated these to the canonical AWS condition key spelling, `aws:SourceVpce`.
- The CLI resource setup used a placeholder resource ID after creating `/health`. I changed it to capture the created resource ID and reuse it in the method and integration commands.
- The Lambda proxy integration examples did not grant API Gateway permission to invoke the Lambda function. I added the required `aws lambda add-permission` command and an `AWS::Lambda::Permission` resource.
- The CloudFormation template referenced an undefined `HealthFunction.Arn`. I replaced it with a `HealthFunctionArn` parameter.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was validated against the official AWS CLI command reference instead of local `--help` output.
