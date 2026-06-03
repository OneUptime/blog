# Validation Summary: How to Use CDK Watch for Hot-Swap Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- AWS CDK CLI
- CDK hot-swap deployments
- CDK watch mode
- AWS Lambda
- Amazon ECS
- AWS Step Functions
- AWS CodeBuild
- Amazon S3 bucket deployments
- AWS AppSync
- Amazon API Gateway
- Amazon EventBridge
- Amazon DynamoDB
- Amazon SQS
- Amazon CloudWatch
- TypeScript and JavaScript

## Sources Consulted
- AWS CDK CLI `cdk deploy` command reference: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-deploy.html
- AWS CDK CLI `cdk watch` command reference: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-watch.html
- AWS CDK CLI reference and `cdk.json` configuration guide: https://docs.aws.amazon.com/cdk/v2/guide/cli.html
- AWS CDK API reference for Lambda `Runtime.NODEJS_20_X`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- AWS CDK API reference for Lambda `DockerImageFunction`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.DockerImageFunction.html
- AWS CDK API reference for Step Functions `DefinitionBody.fromChainable`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_stepfunctions.ChainDefinitionBody.html
- Local AWS CDK CLI help output from `npx cdk deploy --help` and `npx cdk watch --help` using CDK CLI 2.1125.0.

## Issues Found
- The post said resources that are not hot-swappable fall back to CloudFormation. AWS CDK only falls back when `--hotswap-fallback` is used; plain `--hotswap` and default `cdk watch` ignore unsupported changes. Updated the explanation and the `cdk watch` workflow list.
- The supported-resource list was incomplete and too broad in places. Updated it to reflect current official CDK CLI support, including Lambda's limited configuration support, ECS container asset changes, AppSync schema changes, API Gateway, EventBridge, DynamoDB, SQS, CloudWatch, and Bedrock-related changes.
- The Lambda handler example used `lambda.Code.fromAsset('lambda/api')` but described editing `index.ts`. `Code.fromAsset` packages the directory as-is and does not transpile TypeScript. Changed the handler file to `index.js` and converted the handler snippet to valid CommonJS JavaScript.
- The ECS section described general task definition changes as hot-swappable. Official CDK documentation describes ECS hot-swap support as container asset changes. Updated the wording and code comment accordingly.

## Review Notes
- The commands `cdk deploy --hotswap`, `cdk deploy --hotswap-fallback`, `cdk watch`, and `cdk watch --hotswap-fallback` are valid in current CDK CLI help.
- The `cdk.json` `watch.include` and `watch.exclude` structure is valid; AWS documentation accepts strings or arrays and supports `*` and `**` patterns.
- The TypeScript CDK examples use current CDK v2 imports and APIs. `lambda.Runtime.NODEJS_20_X`, `lambda.DockerImageFunction`, `lambda.DockerImageCode.fromImageAsset`, and `sfn.DefinitionBody.fromChainable` are current APIs.
