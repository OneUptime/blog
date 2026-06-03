# Validation Summary: How to Build a Serverless GraphQL API on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS AppSync
- GraphQL
- AWS Lambda
- Amazon DynamoDB
- AWS CLI
- Apollo Server
- Serverless Framework
- Node.js

## Sources Consulted
- AWS AppSync overview: https://docs.aws.amazon.com/appsync/latest/devguide/what-is-appsync.html
- AWS AppSync schema design and CLI schema creation: https://docs.aws.amazon.com/appsync/latest/devguide/designing-your-schema.html
- AWS AppSync scalar types: https://docs.aws.amazon.com/appsync/latest/devguide/scalars.html
- AWS AppSync DynamoDB PutItem resolver mapping templates: https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-resolver-mapping-template-reference-dynamodb-putitem.html
- AWS AppSync DynamoDB Scan resolver mapping templates: https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-resolver-mapping-template-reference-dynamodb-scan.html
- AWS CLI create-graphql-api command reference: https://docs.aws.amazon.com/cli/latest/reference/appsync/create-graphql-api.html
- AWS CLI create-data-source command reference: https://docs.aws.amazon.com/cli/latest/reference/appsync/create-data-source.html
- AWS CLI DynamoDB create-table command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- Apollo Server AWS Lambda deployment guide: https://www.apollographql.com/docs/apollo-server/deployment/lambda
- Serverless Framework AWS serverless.yml reference: https://www.serverless.com/framework/docs/providers/aws/guide/serverless.yml
- Serverless Framework AWS IAM guide: https://www.serverless.com/framework/docs/providers/aws/guide/iam
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS AppSync CloudWatch monitoring documentation: https://docs.aws.amazon.com/appsync/latest/devguide/monitoring.html

## Issues Found
- The AppSync `Post` type had a non-null `author: User!` field, but the DynamoDB item created by the example only stores `authorId`. I added `authorId: ID!` to the AppSync `Post` type and made `author` nullable so the shown resolver can return a valid `Post` without also implementing the nested author resolver.
- The AppSync resolver snippets were fenced as JSON even though they contain VTL expressions and directives. I changed the fences to `vtl`.
- The AppSync `PutItem` resolver manually built DynamoDB string values with interpolated strings. I changed those fields to use `$util.dynamodb.toDynamoDBJson(...)`, matching AWS AppSync's documented DynamoDB typed-value helpers and avoiding invalid values when user input contains characters that need escaping.
- The Apollo resolver imported `uuid` but the install commands did not install it. I added `uuid` to the dependency installation command.
- The Apollo `listPosts` schema accepted `offset`, but the resolver ignored it and DynamoDB `Scan` uses token-based pagination rather than offset pagination. I removed the unused `offset` argument from the schema and resolver signature.
- The Serverless Framework example used `nodejs20.x`, which is deprecated in the current AWS Lambda runtime table. I updated it to `nodejs24.x`, a currently supported Node.js Lambda runtime.

## Review Notes
- AWS AppSync now primarily recommends the APPSYNC_JS runtime for new resolver code, but VTL mapping templates remain documented and supported.
- The examples use broad DynamoDB IAM permissions for brevity. A production implementation should narrow the IAM actions to only the operations the Lambda function needs.
