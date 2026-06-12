# Validation Summary: How to Build a Serverless API with Node.js

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js
- AWS Lambda
- Amazon API Gateway
- Serverless Framework
- AWS Systems Manager Parameter Store
- AWS SDK for JavaScript v3
- AWS SAM
- Jest
- esbuild
- GitHub Actions
- DynamoDB

## Sources Consulted
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS Lambda runtime lifecycle documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda quotas documentation: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS Lambda Node.js handler documentation: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-handler.html
- Serverless Framework serverless.yml reference: https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml
- Serverless Framework AWS Lambda functions documentation: https://www.serverless.com/framework/docs/providers/aws/guide/functions
- Serverless Framework deployment documentation: https://www.serverless.com/framework/docs/providers/aws/guide/deploying
- AWS SAM AWS::Serverless::Function documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS SAM Api event documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-function-api.html
- AWS SAM CLI local start-api documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-local-start-api.html
- AWS SAM CLI local invoke documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-local-invoke.html
- AWS SDK for JavaScript v3 SSM GetParameterCommand documentation: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/ssm-2014-11-06/GetParameter
- AWS CLI ssm put-parameter documentation: https://docs.aws.amazon.com/cli/latest/reference/ssm/put-parameter.html
- AWS Systems Manager Parameter Store CLI documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/param-create-cli.html
- MDN CORS documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS
- MDN Access-Control-Allow-Credentials documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Access-Control-Allow-Credentials
- AWS Lambda provisioned concurrency documentation: https://docs.aws.amazon.com/lambda/latest/dg/provisioned-concurrency.html
- GitHub Actions setup-node documentation: https://github.com/actions/setup-node
- esbuild API documentation: https://esbuild.github.io/api/

## Issues Found
- The Lambda, SAM, GitHub Actions, and esbuild examples used Node.js 18. AWS Lambda's current Node.js runtime documentation lists Node.js 22 and Node.js 24 as supported, while Node.js 18 is no longer listed. Updated the tutorial examples to use `nodejs22.x`, `node-version: '22'`, and `--target=node22`.
- The response helper returned `Access-Control-Allow-Credentials: true` with `Access-Control-Allow-Origin: *`. Browsers reject credentialed CORS responses that use the wildcard origin. Removed the credentials header from the wildcard example.
- The serverless comparison table said maintenance was "None", which overstated the operational reality. Updated it to say runtime and OS updates are provider-managed.
- The serverless avoidance guidance said applications requiring long WebSocket connections should avoid serverless. API Gateway supports WebSocket APIs with Lambda integrations, but a Lambda invocation should not hold a long-lived socket open. Clarified the statement to refer specifically to holding WebSocket connections open inside a function invocation.

## Review Notes
The Serverless Framework examples use `frameworkVersion: '3'`, which remains valid for projects pinned to v3, but new projects should evaluate Serverless Framework v4 and its licensing/authentication requirements. The post's `@aws-sdk/*` esbuild exclusion relies on Lambda's runtime-included AWS SDK v3; for fully reproducible builds, bundling or explicitly packaging SDK dependencies can be preferable.
