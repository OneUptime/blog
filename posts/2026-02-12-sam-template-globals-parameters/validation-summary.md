# Validation Summary: Use SAM Template Globals and Parameters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Serverless Application Model (AWS SAM)
- AWS SAM template Globals
- AWS CloudFormation Parameters, Conditions, and Mappings
- AWS SAM CLI deployment configuration
- AWS Lambda runtimes
- DynamoDB, CloudWatch Alarms, and SNS in CloudFormation snippets

## Sources Consulted
- AWS SAM Globals documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-specification-template-anatomy-globals.html
- AWS SAM `AWS::Serverless::HttpApi` resource documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-httpapi.html
- AWS SAM CLI `sam deploy` command reference: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html
- AWS SAM CLI configuration file documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-config.html
- AWS CloudFormation Parameters documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/parameters-section-structure.html
- AWS CloudFormation Conditions documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/conditions-section-structure.html
- AWS CloudFormation condition functions documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-conditions.html
- AWS CloudFormation Mappings documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/mappings-section-structure.html
- AWS CloudFormation `Fn::FindInMap` documentation: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-findinmap.html
- AWS CloudFormation dynamic references for Secrets Manager: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-secretsmanager.html
- AWS CloudFormation dynamic references for Systems Manager Parameter Store: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/dynamic-references-ssm.html
- AWS Lambda runtime support documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html

## Issues Found
- The Lambda runtime examples used `nodejs20.x`, which has a Lambda deprecation date of April 30, 2026. Updated the examples to `nodejs24.x`, a current Lambda Node.js runtime.
- The post stated that Globals work with only three resource types. Updated the text to list the currently supported SAM Globals resource types and kept the existing three examples as common cases.
- The `HttpApi` Globals example used `CorsConfiguration`, which is a property of `AWS::Serverless::HttpApi` but is not supported in the SAM `Globals.HttpApi` section. Replaced it with supported `Auth` and `StageVariables` properties.
- The Conditions example referenced `AlertEmail` without defining it in that snippet. Added the missing parameter definition.
- The Mappings example referenced `Environment` without defining it in that snippet. Added the missing parameter definition.

## Review Notes
The local environment did not have the SAM CLI, AWS CLI, or cfn-lint installed, so CLI validation could not be run. Review was performed against current official AWS documentation.
