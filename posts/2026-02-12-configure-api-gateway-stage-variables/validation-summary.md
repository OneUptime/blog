# Validation Summary: How to Configure API Gateway Stage Variables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon API Gateway REST APIs
- API Gateway stage variables
- AWS Lambda aliases and resource-based permissions
- AWS CLI
- AWS CDK v2
- DynamoDB SDK for JavaScript
- Velocity Template Language mapping templates

## Sources Consulted
- AWS API Gateway Developer Guide: Use stage variables for a REST API: https://docs.aws.amazon.com/apigateway/latest/developerguide/stage-variables.html
- AWS API Gateway Developer Guide: Set up stage variables for REST APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/how-to-set-stage-variables-aws-console.html
- AWS API Gateway API Reference: Patch Operations / UpdateStage: https://docs.aws.amazon.com/apigateway/latest/api/patch-operations.html
- AWS CLI Command Reference: apigateway update-stage: https://docs.aws.amazon.com/cli/latest/reference/apigateway/update-stage.html
- AWS CLI Command Reference: lambda add-permission: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- AWS API Gateway Developer Guide: Lambda proxy integrations: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- AWS API Gateway Developer Guide: HTTP API stage variables reference: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-stages.stage-variables-reference.html
- AWS CDK API Reference: aws_apigateway.StageOptions: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_apigateway.StageOptions.html
- AWS CloudFormation Template Reference: AWS::ApiGateway::Stage Variables: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-stage.html
- AWS API Gateway Developer Guide: REST API quotas: https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-execution-service-limits-table.html

## Issues Found
- The Lambda integration URI example used a raw Lambda ARN. API Gateway Lambda integrations require the API Gateway Lambda URI format ending in `/invocations`, so the URI was updated to `arn:aws:apigateway:...:lambda:path/2015-03-31/functions/arn:aws:lambda:.../invocations`.
- The CDK example created Lambda aliases and stage variables, but used `LambdaIntegration(handler)`, which invoked the base function and did not use the stage variable. The example was changed to an `apigateway.Integration` with an `AWS_PROXY` Lambda URI containing `${stageVariables.lambdaAlias}`.
- The CDK example did not grant API Gateway permission to invoke the alias-qualified Lambda ARNs it routed to. Alias-specific `addPermission` calls were added for the `dev` and `prod` stages.
- The limitations section stated that stage variable names can include hyphens, underscores, and periods. Official CloudFormation and CDK docs limit REST API stage variable names to alphanumeric characters, so this was corrected.
- The limitations section listed 128 stage variables per stage. Official API Gateway quotas list 100 stage variables per stage, with a 64-character key limit and 512-character value limit, so the quota bullets were corrected.

## Review Notes
The AWS CLI could not be checked locally because the `aws` binary is not installed in this workspace, so command validation was performed against the official AWS CLI reference. The post focuses on REST APIs; the HTTP API note is directionally correct but should remain caveated because HTTP APIs support stage variables in a narrower set of integration fields.
