# Validation Summary: How to Set Up Amplify Backend with CDK

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Amplify JavaScript library
- AWS CDK v2
- Amazon Cognito User Pools
- Amazon Cognito Identity Pools
- AWS AppSync
- Amazon DynamoDB
- Amazon S3
- AWS Lambda
- TypeScript
- GraphQL

## Sources Consulted
- AWS CDK v2 Developer Guide, working with the CDK library: https://docs.aws.amazon.com/cdk/v2/guide/work-with.html
- AWS CDK supported Node.js versions: https://docs.aws.amazon.com/cdk/v2/guide/node-versions.html
- AWS CDK Cognito Identity Pool construct docs: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito_identitypool-readme.html
- AWS CDK `UserPoolAuthenticationProviderProps` API docs: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito_identitypool.UserPoolAuthenticationProviderProps.html
- AWS CDK AppSync `MappingTemplate` API docs: https://docs.aws.amazon.com/cdk/api/v2/dotnet/api/Amazon.CDK.AWS.AppSync.MappingTemplate.html
- AWS CDK S3 bucket grant docs: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketGrants.html
- AWS Amplify JavaScript category configuration docs: https://docs.amplify.aws/gen1/javascript/tools/libraries/configure-categories/
- AWS Amplify Gen 2 custom S3 bucket documentation: https://docs.amplify.aws/react/frontend/storage/use-with-custom-s3/
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CDK Lambda runtime API docs: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- OneUptime linked custom pipelines post: https://oneuptime.com/blog/post/2026-02-12-set-up-amplify-custom-pipelines/view

## Issues Found
- The post described the approach as "Amplify Gen 2 and CDK," but the examples are plain CDK stacks configured for Amplify client libraries rather than an Amplify Gen 2 backend definition. I changed the wording to "Amplify's frontend libraries and CDK" and "Amplify-compatible backend."
- The prerequisites listed Node.js 18 or later. Current AWS CDK support has ended for Node.js 18, so I changed the prerequisite to Node.js 20 or 22.
- The CDK install command mixed CDK v1 service packages (`@aws-cdk/aws-*`) with a CDK v2 project. I changed it to install `aws-cdk-lib` and `constructs`, which is the CDK v2 package model.
- The Cognito identity pool example used the low-level `CfnIdentityPool` without attaching roles. That would not provide usable AWS credentials for Amplify Storage. I replaced it with the CDK v2 `IdentityPool` construct and associated it with the user pool client.
- The storage stack did not grant the Cognito identity pool role any S3 permissions, so authenticated users would not be able to use the bucket through Amplify Storage. I updated the stack props to accept the identity pool and grant read/write access to its authenticated role.
- The DynamoDB table used both `id` and `createdAt` as the primary key, but the AppSync `GetItem` resolver supplied only `id`. I removed the table sort key so the resolver matches the table's key schema.
- The API stack comment said it output an API URL and key, but the stack did not create an API key. I corrected the comment to say it outputs the API URL.
- The schema included additional operations while the CDK example only created a `getTodo` resolver. I added a sentence clarifying that the other fields require additional resolvers.
- The Lambda example used `NODEJS_20_X`; Node.js 20 is now deprecated in AWS Lambda. I changed it to `NODEJS_22_X`.

## Review Notes
- The extracted TypeScript snippets were compiled against current `aws-cdk-lib`, `constructs`, TypeScript, and Node type definitions with `tsc --noEmit`.
- The tutorial still demonstrates only one AppSync resolver. The remaining schema fields are now explicitly framed as fields to implement with additional resolvers.
