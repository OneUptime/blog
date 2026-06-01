# Validation Summary: How to Use Lambda Aliases and Versions for Deployment Strategies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda versions
- AWS Lambda aliases
- AWS Lambda weighted alias routing
- AWS CLI for Lambda
- AWS CloudFormation
- Amazon API Gateway HTTP API integrations
- AWS SDK for JavaScript v3
- Lambda provisioned concurrency

## Sources Consulted
- AWS Lambda: Manage Lambda function versions: https://docs.aws.amazon.com/lambda/latest/dg/configuration-versions.html
- AWS Lambda: Implement canary deployments using a weighted alias: https://docs.aws.amazon.com/lambda/latest/dg/configuring-alias-routing.html
- AWS CloudFormation: AWS::Lambda::Alias: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-alias.html
- AWS CloudFormation: AWS::Lambda::Alias AliasRoutingConfiguration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-lambda-alias-aliasroutingconfiguration.html
- AWS CloudFormation: AWS::Lambda::Version: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-version.html
- AWS CloudFormation: AWS::ApiGatewayV2::Integration: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigatewayv2-integration.html
- AWS Lambda API: PutProvisionedConcurrencyConfig: https://docs.aws.amazon.com/lambda/latest/api/API_PutProvisionedConcurrencyConfig.html
- AWS SDK for JavaScript v3 Lambda client reference: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/lambda/
- AWS Lambda runtimes: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Referenced OneUptime canary deployments post: https://oneuptime.com/blog/post/2026-02-12-implement-canary-deployments-for-lambda-functions/view

## Issues Found
- The CloudFormation example used `nodejs20.x`, which AWS lists as deprecated as of April 30, 2026. Updated it to `nodejs24.x`, a current Lambda Node.js runtime on the validation date.
- The CloudFormation `AWS::ApiGatewayV2::Integration` example used `!Ref ProductionAlias` directly as `IntegrationUri`. For Lambda proxy integrations, API Gateway expects the Lambda invocation URI format. Updated the snippet to build the `arn:${AWS::Partition}:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${AliasArn}/invocations` URI and added `IntegrationMethod: POST` and `PayloadFormatVersion: '2.0'`.
- The CloudFormation version comment said the resource publishes a new version each time code changes. `AWS::Lambda::Version` is a separate version resource and must be updated or replaced for each release. Reworded the comment to avoid implying automatic republishing.
- The weighted alias CloudFormation example referenced an undefined `PreviousVersion`. Replaced it with a literal previous version value (`'5'`) to keep the snippet valid as an example.
- The provisioned concurrency explanation implied an alias-only configuration and pre-warming a new version regardless of qualifier. AWS supports provisioned concurrency on a version or alias, so the wording now states that the version or alias receiving traffic should have provisioned concurrency configured.

## Review Notes
The AWS CLI examples for publishing versions, creating and updating aliases, weighted routing, direct qualified invocation, deleting versions with `Qualifier`, and configuring provisioned concurrency align with current AWS documentation. The linked OneUptime canary deployments post resolves correctly. The cleanup example is syntactically valid for AWS SDK for JavaScript v3, but production cleanup should also account for pagination and avoid deleting versions still referenced by aliases or other integrations.
