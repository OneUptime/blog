# Validation Summary: How to Write Integration Tests for CDK Stacks

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CDK
- AWS CDK integration tests
- @aws-cdk/integ-tests-alpha
- @aws-cdk/integ-runner
- TypeScript
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon S3
- Amazon SQS

## Sources Consulted
- AWS CDK API Reference for integ-tests-alpha: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.integ_tests_alpha/README.html
- AWS CDK API Reference for IDeployAssert: https://docs.aws.amazon.com/cdk/api/v2/docs/%40aws-cdk_integ-tests-alpha.IDeployAssert.html
- npm package metadata and bundled type definitions for @aws-cdk/integ-tests-alpha 2.257.0-alpha.0
- npm package metadata and README for @aws-cdk/integ-runner 2.198.0
- @aws-cdk/cloud-assembly-schema type definitions for integration test TestOptions and CDK command options

## Issues Found
- The setup command installed only `@aws-cdk/integ-tests-alpha`, but the running commands use the `integ-runner` binary from `@aws-cdk/integ-runner`. Updated the install command to include both packages.
- The first integration test snippet imported `ExpectedResult` without using it. Removed the unused import so the snippet is friendlier to stricter TypeScript configurations.
- The API endpoint example described `stack.apiEndpoint` as a `CfnOutput`, but `httpApiCall` expects a URL string/token exposed by the stack, not a `CfnOutput` object. Updated the comment.
- The Lambda example used generic `awsApiCall` plus `ExpectedResult.absent()`. `ExpectedResult.absent()` is not part of `@aws-cdk/integ-tests-alpha`, and the package provides `invokeFunction` for Lambda invocation permissions. Replaced it with `integ.assertions.invokeFunction`.
- The waits section called `waitForAssertions` an option. It is a method on API call assertions. Updated the wording.
- The SQS wait example asserted an object at `Messages.0.Body`, but SQS returns the message body as a string. Updated the assertion to use `ExpectedResult.stringLikeRegexp`.
- The full CRUD example implied ordered steps, but each assertion/API call is its own resource and can run independently unless chained. Added `next()` dependencies between create, DynamoDB read, API read, and delete calls.
- The "Run a specific integration test" command did not name a test file. Added the test filename argument relative to the configured `--directory`.

## Review Notes
The `@aws-cdk/integ-tests-alpha` package is still experimental and can receive breaking changes outside normal semantic versioning. The post is accurate for the currently checked package APIs, but future CDK upgrades should revalidate these examples.
