# Validation Summary: How to Use DynamoDB with AWS AppSync

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS AppSync
- Amazon DynamoDB
- GraphQL
- AppSync VTL resolvers
- AppSync JavaScript resolvers
- AWS CDK
- AWS CLI
- AWS Amplify client subscriptions
- Amazon CloudWatch

## Sources Consulted
- AWS AppSync DynamoDB PutItem resolver reference: https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-resolver-mapping-template-reference-dynamodb-putitem.html
- AWS AppSync DynamoDB DeleteItem resolver reference: https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-resolver-mapping-template-reference-dynamodb-deleteitem.html
- AWS AppSync JavaScript DynamoDB PutItem reference: https://docs.aws.amazon.com/appsync/latest/devguide/js-aws-appsync-resolver-reference-dynamodb-putitem.html
- AWS AppSync JavaScript DynamoDB Query reference: https://docs.aws.amazon.com/appsync/latest/devguide/js-aws-appsync-resolver-reference-dynamodb-query.html
- AWS AppSync JavaScript DynamoDB UpdateItem reference: https://docs.aws.amazon.com/appsync/latest/devguide/js-aws-appsync-resolver-reference-dynamodb-updateitem.html
- AWS AppSync DynamoDB helper reference: https://docs.aws.amazon.com/appsync/latest/devguide/dynamodb-helpers-in-util-dynamodb.html
- AWS AppSync subscriptions guide: https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html
- AWS CLI DynamoDB create-table reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/dynamodb/create-table.html
- AWS CLI DynamoDB update-table reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-table.html
- AWS CDK AppSync GraphqlApiProps reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_appsync.GraphqlApiProps.html
- AWS CDK AppSync FunctionRuntime reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_appsync.FunctionRuntime.html
- OneUptime linked post: https://oneuptime.com/blog/post/2026-02-12-monitor-dynamodb-with-cloudwatch-alarms/view

## Issues Found
- The description claimed "automatic CRUD operations", but the tutorial manually defines resolvers. Changed it to "CRUD operations".
- Several VTL resolver snippets were fenced as JSON even though they contained Velocity directives and utility calls. Changed those fences to `vtl`.
- The create and get VTL resolvers used hand-written DynamoDB attribute JSON in places where escaping and type conversion could be wrong. Updated them to use AppSync DynamoDB utility helpers.
- The list VTL resolver always emitted `nextToken`, including null values. Changed it to emit `nextToken` only when provided.
- The update VTL resolver used undefined placeholders such as `#titleSet` and did not build valid DynamoDB expression names or values. Rewrote it to build a valid `UpdateItem` expression with AppSync DynamoDB helper conversions.
- The post declared and described delete support but did not include a delete resolver. Added a `DeleteItem` resolver using the AppSync-supported request shape.
- The AppSync JavaScript create resolver used `|| null`, which would convert empty strings to null. Changed it to nullish coalescing so only null or undefined become null.
- The CDK example used the deprecated `schema` property on `GraphqlApiProps`. Updated it to the current `definition: appsync.Definition.fromFile(...)` API.

## Review Notes
The AWS CLI examples match the documented DynamoDB `create-table` and `update-table` command shapes. The AppSync subscription schema and Amplify client subscription pattern are technically valid, but a production post could mention authorization choices and the AppSync note that, as of March 13, 2025, AppSync Events is available for standalone WebSocket Pub/Sub APIs.
