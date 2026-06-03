# Validation Summary: How to Build a GraphQL API with AppSync and DynamoDB

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS AppSync
- GraphQL
- DynamoDB
- AppSync JavaScript resolvers
- Velocity Template Language
- AWS Lambda
- AWS Amplify JavaScript
- Amazon Cognito authorization
- CloudWatch
- AWS X-Ray

## Sources Consulted
- AWS AppSync JavaScript resolver function reference for DynamoDB: https://docs.aws.amazon.com/appsync/latest/devguide/js-resolver-reference-dynamodb.html
- AWS AppSync JavaScript resolver reference for DynamoDB GetItem, PutItem, Query, Scan, and UpdateItem: https://docs.aws.amazon.com/appsync/latest/devguide/js-aws-appsync-resolver-reference-dynamodb-getitem.html
- AWS AppSync JavaScript resolver overview and pipeline context behavior: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-overview-js.html
- AWS AppSync JavaScript built-in utilities: https://docs.aws.amazon.com/appsync/latest/devguide/built-in-util-js.html
- AWS AppSync JavaScript resolver context object reference: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-context-reference-js.html
- AWS AppSync authorization and authentication documentation: https://docs.aws.amazon.com/appsync/latest/devguide/security-authz.html
- AWS Amplify JavaScript v5 to v6 migration guide for GraphQL API usage: https://docs.amplify.aws/gen1/javascript/build-a-backend/troubleshooting/migrate-from-javascript-v5-to-v6/
- AWS Amplify JavaScript GraphQL API subscription documentation: https://docs.amplify.aws/gen1/javascript/build-a-backend/graphqlapi/subscribe-data/
- Boto3 DynamoDB create_table documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/client/create_table.html
- AWS AppSync monitoring documentation: https://docs.aws.amazon.com/appsync/latest/devguide/monitoring.html
- AWS AppSync X-Ray tracing documentation: https://docs.aws.amazon.com/appsync/latest/devguide/x-ray-tracing.html

## Issues Found
- AppSync JavaScript resolver snippets used `util` without importing it. Added `import { util } from '@aws-appsync/utils';` to the resolver examples that call `util`.
- The authorization resolver used `ctx.prev.result` without explaining that this value is only available from a previous pipeline resolver step. Updated the comment to identify it as a pipeline function after a `GetItem` function.
- The authorization resolver used `ctx.identity.groups`, but Cognito user pool group membership is exposed through claims. Updated it to read `ctx.identity.claims['cognito:groups'] || []`.
- The authorization section implied native AppSync schemas use the Amplify `@auth` directive directly. Clarified the distinction between AppSync authorization directives such as `@aws_cognito_user_pools` and Amplify GraphQL Transformer directives such as `@auth`.
- The Amplify client subscription example used v5-style `API.graphql(graphqlOperation(...))`. Updated it to the current Amplify JavaScript `generateClient` and `client.graphql({ query, variables }).subscribe(...)` pattern.
- The opening paragraph overstated offline support as an AppSync-only feature. Clarified that offline support is available when paired with clients such as Amplify DataStore.
- The conclusion referred to the JavaScript resolver pipeline generally even though most examples are unit resolvers. Changed it to the JavaScript resolver runtime.

## Review Notes
The DynamoDB table creation example, GraphQL schema shape, AppSync DynamoDB operation request objects, subscription directive usage, Lambda resolver event access pattern, CloudWatch monitoring claim, and X-Ray tracing claim were consistent with the official documentation reviewed. The Python and JavaScript snippets were syntax-checked after the fixes.
