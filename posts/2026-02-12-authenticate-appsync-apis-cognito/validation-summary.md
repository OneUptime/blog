# Validation Summary: Authenticate AppSync APIs with Cognito

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS AppSync
- Amazon Cognito User Pools
- GraphQL authorization directives
- AWS CLI
- AWS CloudFormation / SAM
- AWS Amplify JavaScript
- AppSync JavaScript resolvers
- DynamoDB resolver operations

## Sources Consulted
- AWS AppSync Developer Guide: Configuring authorization and authentication to secure your GraphQL APIs - https://docs.aws.amazon.com/appsync/latest/devguide/security-authz.html
- AWS CLI Command Reference: `appsync update-graphql-api` - https://docs.aws.amazon.com/cli/latest/reference/appsync/update-graphql-api.html
- AWS AppSync Developer Guide: JavaScript resolver context object reference - https://docs.aws.amazon.com/appsync/latest/devguide/resolver-context-reference-js.html
- AWS AppSync Developer Guide: JavaScript resolver function reference for DynamoDB `UpdateItem` - https://docs.aws.amazon.com/appsync/latest/devguide/js-aws-appsync-resolver-reference-dynamodb-updateitem.html
- AWS AppSync Developer Guide: DynamoDB helpers in `$util.dynamodb` - https://docs.aws.amazon.com/appsync/latest/devguide/dynamodb-helpers-in-util-dynamodb.html
- AWS AppSync Developer Guide: Creating basic queries and mutations with JavaScript resolvers - https://docs.aws.amazon.com/appsync/latest/devguide/configuring-resolvers-js.html
- AWS AppSync Developer Guide: Building a client application using Amplify client - https://docs.aws.amazon.com/appsync/latest/devguide/building-a-client-app.html
- AWS CloudFormation Reference: `AWS::AppSync::GraphQLApi` and additional authentication providers - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-appsync-graphqlapi.html
- AWS CloudFormation Reference: `AWS::Cognito::UserPoolClient` - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-cognito-userpoolclient.html
- Amazon Cognito API Reference: `InitiateAuth` - https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html

## Issues Found
- The schema examples used `@aws_auth(cognito_groups: ...)` while the API was configured with multiple authorization modes. AWS documents that `@aws_auth` is only for Cognito User Pools APIs without additional authorization modes. Changed these examples to `@aws_cognito_user_pools(cognito_groups: ...)`, which supports the same group argument in multi-auth schemas.
- The owner-based `updateProduct` resolver only performed a `GetItem` and returned the existing product, so it did not actually update the item as described. Replaced it with an `UpdateItem` resolver that builds a DynamoDB update expression and applies an owner condition for non-admin users.
- The `createProduct` resolver passed the partition key inside both `key` and `attributeValues`. Adjusted the snippet so `attributeValues` contains only non-key attributes, matching AWS AppSync DynamoDB resolver examples.
- The Amplify configuration omitted the AppSync region and API key even though the sample later performs an API-key request with `authMode: 'apiKey'`. Added `region` and `apiKey` to the `API.GraphQL` configuration.
- Removed an unused `getCurrentUser` import from the Amplify sample and avoided optional chaining in the AppSync resolver response handler for broader runtime clarity.

## Review Notes
The AWS CLI could not be checked locally because the `aws` binary is not installed in this workspace, so command validation was performed against official AWS CLI and AWS service documentation. The examples remain illustrative and still require real resource IDs, an API key, matching GraphQL input/type definitions, and deployed AppSync data sources/resolvers to run end to end.
