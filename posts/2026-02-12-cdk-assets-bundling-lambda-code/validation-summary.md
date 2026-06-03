# Validation Summary: How to Use CDK Assets for Bundling Lambda Code

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK v2
- AWS Lambda
- CDK file assets and Lambda code assets
- TypeScript and JavaScript Lambda bundling with `aws-lambda-nodejs`
- Python Lambda packaging with `@aws-cdk/aws-lambda-python-alpha`
- Docker-based and local CDK bundling
- Lambda layers
- npm
- Go and Rust custom runtimes on `provided.al2023`

## Sources Consulted
- AWS CDK Developer Guide: Assets and the AWS CDK: https://docs.aws.amazon.com/cdk/v2/guide/assets.html
- AWS CDK API Reference: `aws_s3_assets.AssetOptions`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3_assets.AssetOptions.html
- AWS CDK API Reference: `aws_lambda_nodejs` module: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs-readme.html
- AWS CDK API Reference: `aws_lambda_nodejs.BundlingOptions`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda_nodejs.BundlingOptions.html
- AWS CDK API Reference: `@aws-cdk/aws-lambda-python-alpha` module: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-lambda-python-alpha-readme.html
- AWS CDK API Reference: `BundlingOptions`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.BundlingOptions.html
- AWS Lambda Developer Guide: Building Lambda functions with Node.js: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS Lambda Developer Guide: Building Lambda functions with Go: https://docs.aws.amazon.com/lambda/latest/dg/lambda-golang.html
- AWS Lambda Developer Guide: Working with layers for Node.js Lambda functions: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-layers.html
- npm Docs: `npm ci`: https://docs.npmjs.com/cli/commands/npm-ci/
- Docker Official Image: `golang`: https://hub.docker.com/_/golang/

## Issues Found
- The `NodejsFunction` example used `treeShaking: true`, but CDK's `aws-lambda-nodejs.BundlingOptions` does not expose a `treeShaking` property. Removed that option while keeping the surrounding esbuild bundling explanation.
- The `NodejsFunction` stack example used `cdk.Duration` without importing `aws-cdk-lib`. Added the missing `cdk` import.
- The Lambda handler TypeScript example referenced `APIGatewayProxyEvent` without importing the type. Added the missing `import type` from `aws-lambda`.
- The `PythonFunction` example used `lambda.Runtime` and `cdk.Duration` without showing the corresponding imports. Added the missing imports.
- The Go custom bundling example said it used a Go Docker image but configured `lambda.Runtime.PROVIDED_AL2023.bundlingImage`, which is an OS runtime image and not a Go build image. Changed it to the Docker Official Go image hosted on Amazon ECR Public.
- The asset exclusion example excluded `node_modules/aws-sdk` for a Node.js 20 Lambda. Node.js 20 includes AWS SDK for JavaScript v3 packages, not the v2 `aws-sdk` package. Updated the exclusion to `node_modules/@aws-sdk/**`.
- The asset hashing example combined `assetHashType: cdk.AssetHashType.SOURCE` with a custom `assetHash`, which CDK documents as invalid unless `assetHashType` is unset or `AssetHashType.CUSTOM`. Split this into separate source-hash and custom-hash examples.
- The asset hashing comment described modification-time hashing, which is not what `AssetHashType.SOURCE` means. Updated the comment to source-content hashing.
- The layer bundling command used `npm ci --production`. Updated it to the current `npm ci --omit=dev` form.

## Review Notes
The post is technically relevant and accurate after the fixes. Future improvements could mention that Lambda's runtime-included AWS SDK for JavaScript v3 is a specific runtime/Region-provided minor version, so production functions that need deterministic SDK versions should bundle their SDK dependencies instead of relying on the runtime copy.
