# Validation Summary: Use AppSync Pipeline Resolvers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS AppSync pipeline resolvers
- AWS AppSync JavaScript runtime (APPSYNC_JS)
- GraphQL resolvers
- AWS AppSync functions
- Amazon DynamoDB resolver operations
- AWS Lambda data sources
- AWS CloudFormation
- Amazon CloudWatch metrics

## Sources Consulted
- AWS AppSync JavaScript resolvers overview: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-overview-js.html
- AWS AppSync JavaScript pipeline resolvers guide: https://docs.aws.amazon.com/appsync/latest/devguide/pipeline-resolvers-js.html
- AWS AppSync JavaScript resolver context object reference: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-context-reference-js.html
- AWS AppSync DynamoDB GetItem resolver reference: https://docs.aws.amazon.com/appsync/latest/devguide/js-aws-appsync-resolver-reference-dynamodb-getitem.html
- AWS AppSync DynamoDB PutItem resolver reference: https://docs.aws.amazon.com/appsync/latest/devguide/js-aws-appsync-resolver-reference-dynamodb-putitem.html
- AWS AppSync Lambda resolver reference for JavaScript: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-lambda-js.html
- AWS CloudFormation AWS::AppSync::FunctionConfiguration reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-appsync-functionconfiguration.html
- AWS CloudFormation AWS::AppSync::Resolver reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-appsync-resolver.html
- AWS CloudFormation AppSyncRuntime reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-appsync-functionconfiguration-appsyncruntime.html
- AWS AppSync EnhancedMetricsConfig API reference: https://docs.aws.amazon.com/appsync/latest/APIReference/API_EnhancedMetricsConfig.html

## Issues Found
- The pipeline resolver JavaScript examples used `util.time.nowISO8601()` without importing `util`. Added `import { util } from '@aws-appsync/utils';` to the standalone resolver snippet and the inline CloudFormation `Code` example.
- The CloudFormation `CodeS3Location` examples used local file paths like `functions/validateUser.js`, but CloudFormation expects an Amazon S3 location for this property. Added a `ResolverCodeBucket` parameter and changed the values to `s3://` locations with `!Sub`.
- The inventory function description claimed it verified all requested items, while the code only fetched and checked `items[0]`. Updated the description to make the simplified first-item behavior explicit.
- The create-order function calculated totals across all input items using a single stashed product price from the first inventory item. Updated the example to create a single-item order using the checked item, matching the simplified inventory example.
- The error handling section implied the pipeline after handler should handle function-thrown errors. Updated it to distinguish `util.error`, which stops later pipeline execution, from data source errors available as `ctx.error` in a function response handler.

## Review Notes
The examples are intentionally simplified and do not include full schema, IAM role, table, or GraphQL API definitions. For production multi-item orders, the inventory step should use BatchGetItem or Lambda and stash per-product inventory and pricing data.
