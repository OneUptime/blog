# Validation Summary: How to Use Amplify API (GraphQL) with AppSync

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Amplify Gen 1 CLI
- AWS Amplify JavaScript library
- AWS AppSync
- GraphQL
- Amplify GraphQL Transformer directives
- Amazon DynamoDB
- AWS Lambda
- AWS SDK for JavaScript v3
- Amazon CloudWatch

## Sources Consulted
- AWS Amplify Gen 1: Set up Amplify GraphQL API: https://docs.amplify.aws/gen1/javascript/build-a-backend/graphqlapi/set-up-graphql-api/
- AWS Amplify Gen 1: Connect your app code to the API: https://docs.amplify.aws/gen1/javascript/build-a-backend/graphqlapi/connect-to-api/
- AWS Amplify Gen 1: Read application data: https://docs.amplify.aws/gen1/javascript/build-a-backend/graphqlapi/query-data/
- AWS Amplify Gen 1: Subscribe to real-time events: https://docs.amplify.aws/gen1/react/build-a-backend/graphqlapi/subscribe-data/
- AWS Amplify Gen 1: Customize your data model: https://docs.amplify.aws/gen1/react/build-a-backend/graphqlapi/data-modeling/
- AWS Amplify Gen 1: Configure Lambda resolvers with @function: https://docs.amplify.aws/gen1/react/tools/cli-legacy/function-directive/
- AWS AppSync authorization documentation: https://docs.aws.amazon.com/appsync/latest/devguide/security-authz.html
- AWS AppSync server-side caching documentation: https://docs.aws.amazon.com/appsync/latest/devguide/enabling-caching.html
- AWS AppSync CloudWatch monitoring documentation: https://docs.aws.amazon.com/appsync/latest/devguide/monitoring.html
- AWS Lambda Node.js runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- AWS SDK for JavaScript v3 DynamoDB document client documentation: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-dynamodb-doc-client.html

## Issues Found
- The client-side query, mutation, subscription, and pagination snippets used the older `API.graphql(graphqlOperation(...))` style from Amplify JavaScript v5. Updated them to use the current `generateClient()` API from `aws-amplify/api`.
- The schema showed `postID: ID! @index(name: "byPost")`, but the `@hasMany` and `@belongsTo` directives did not explicitly use that relationship key. Updated the relationship directives to `@hasMany(indexName: "byPost", fields: ["id"])` and `@belongsTo(fields: ["postID"])`, matching current Transformer v2 examples.
- The Lambda resolver queried a DynamoDB index named `byStatus`, but the schema did not create that index. Added `@index(name: "byStatus", queryField: null)` to `Post.status`.
- The Lambda resolver used the deprecated AWS SDK for JavaScript v2 `aws-sdk` DocumentClient pattern. Updated it to use the AWS SDK for JavaScript v3 `DynamoDBDocumentClient` and `QueryCommand`.
- The post did not identify that the `amplify add api` project layout is the Amplify Gen 1 CLI workflow. Added a short clarification so readers do not confuse it with Amplify Gen 2's TypeScript-first backend flow.

## Review Notes
- The tutorial is now accurate for the Amplify Gen 1 CLI workflow with the current Amplify JavaScript client API.
- New greenfield Amplify projects may prefer Amplify Gen 2, but the Gen 1 GraphQL API documentation remains available and the reviewed commands are still valid for Gen 1 projects.
- The custom Lambda resolver still assumes the function has permission to query the Post table and that `POST_TABLE_NAME` is configured in the function environment.
