# Validation Summary: How to Use Amplify with AWS AppSync Merged APIs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS AppSync Merged APIs
- AWS Amplify Gen 1 and Gen 2
- GraphQL
- AWS CLI
- Amplify CLI code generation
- Amazon Cognito User Pools
- AWS IAM
- Amazon CloudWatch metrics

## Sources Consulted
- AWS AppSync Developer Guide: Merging APIs in AWS AppSync: https://docs.aws.amazon.com/appsync/latest/devguide/merged-api.html
- AWS CLI Command Reference: `create-graphql-api`: https://docs.aws.amazon.com/cli/latest/reference/appsync/create-graphql-api.html
- AWS CLI Command Reference: `associate-source-graphql-api`: https://docs.aws.amazon.com/cli/latest/reference/appsync/associate-source-graphql-api.html
- AWS CLI Command Reference: `start-schema-merge`: https://docs.aws.amazon.com/cli/latest/reference/appsync/start-schema-merge.html
- AWS CLI Command Reference: `get-introspection-schema`: https://docs.aws.amazon.com/cli/latest/reference/appsync/get-introspection-schema.html
- AWS Amplify Gen 1 docs: Connect your app code to the API: https://docs.amplify.aws/gen1/react/build-a-backend/graphqlapi/connect-to-api/
- AWS Amplify Gen 1 docs: Client code generation: https://docs.amplify.aws/gen1/react/build-a-backend/graphqlapi/client-code-generation/
- AWS Amplify Gen 2 docs: About `amplify_outputs.json`: https://docs.amplify.aws/flutter/reference/amplify_outputs/
- AWS Amplify Gen 2 docs: Custom resources and `backend.addOutput`: https://docs.amplify.aws/react/build-a-backend/add-aws-services/custom-resources/

## Issues Found
- The post tagged the article with API Gateway even though API Gateway is not covered. Removed the API Gateway tag.
- The introduction and frontend query explanation described the Merged API as routing requests to source APIs. Updated the language to match AppSync's model of a merged schema that imports source API schemas, resolvers, data sources, and functions.
- The `create-graphql-api` command omitted the required merged API execution role for Merged APIs. Added `--merged-api-execution-role-arn` and noted the required `appsync:SourceGraphQL` permission.
- The source API association step used `start-schema-merge` as if it created associations. Replaced it with `associate-source-graphql-api`, added source API identifiers and merge configuration, and kept `start-schema-merge` only for manual merges after an association exists.
- The Amplify Gen 2 snippet used `backend.addOutput` custom values as if that directly configured the GraphQL client. Replaced it with a frontend `Amplify.configure` example using `parseAmplifyConfig` and an `API.GraphQL` configuration.
- The Amplify codegen command omitted the region and used a less current generation command. Updated it to the documented `npx @aws-amplify/cli codegen add --apiId ... --region ...` and `npx @aws-amplify/cli codegen`.
- The authentication section implied source API auth settings are automatically respected without qualification. Added the AppSync requirement that the Merged API include each source API's primary auth mode as either a primary or additional auth mode.
- The schema conflict section listed incorrect merge strategies, including a namespace prefix option, and incorrectly described auto merge as keeping the most recent definition. Replaced this with AppSync's manual and auto merge modes plus the documented conflict-resolution directives `@canonical`, `@hidden`, and `@renamed`.
- The monitoring section suggested source-API-specific CloudWatch metrics in a command that only queried the merged API ID. Updated the wording to describe merged API latency and errors.
- The common issues section described the Merged API as adding a routing layer. Replaced this with guidance to investigate resolver, function, and data source performance through AppSync and CloudWatch metrics.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI command reference rather than local `aws --help` output. The example schemas are illustrative and still require real AppSync resolvers, data sources, and IAM/auth configuration before they can serve data.
