# Validation Summary: How to Build a Full-Stack App with Amplify Gen 2

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Amplify Gen 2
- AWS CDK
- Amazon Cognito
- AWS AppSync
- Amazon DynamoDB
- Amazon S3 / Amplify Storage
- AWS Lambda functions
- TypeScript
- React
- Vite
- Amplify UI React

## Sources Consulted
- AWS Amplify Gen 2 React manual installation: https://docs.amplify.aws/react/start/manual-installation/
- AWS Amplify Gen 2 Auth setup: https://docs.amplify.aws/react/build-a-backend/auth/set-up-auth/
- AWS Amplify Gen 2 user attributes: https://docs.amplify.aws/react/build-a-backend/auth/concepts/user-attributes/
- AWS Amplify Gen 2 multi-factor authentication: https://docs.amplify.aws/react/build-a-backend/auth/concepts/multi-factor-authentication/
- AWS Amplify Gen 2 Data setup: https://docs.amplify.aws/react/build-a-backend/data/set-up-data/
- AWS Amplify Gen 2 data relationships: https://docs.amplify.aws/react/build-a-backend/data/data-modeling/relationships/
- AWS Amplify Gen 2 custom queries and mutations: https://docs.amplify.aws/react/build-a-backend/data/custom-business-logic/
- AWS Amplify Gen 2 Storage setup and access rules: https://docs.amplify.aws/react/build-a-backend/storage/set-up-storage/
- AWS Amplify Gen 2 sandbox environments: https://docs.amplify.aws/react/deploy-and-host/sandbox-environments/setup/
- Local compile check with @aws-amplify/backend 1.23.0, aws-amplify 6.17.0, @aws-amplify/ui-react, React, and TypeScript.

## Issues Found
- The custom business logic example used `.handler(a.handler.function('taskStats'))`, which is only the documented pattern for referencing an existing external Lambda function by name. For a Gen 2 backend-defined Lambda function, the official documentation defines a function with `defineFunction` and passes that resource to `a.handler.function(...)`. Updated the snippet to add `defineFunction({ entry: './task-stats/handler.ts' })` and use `.handler(a.handler.function(taskStats))`.

## Review Notes
- The backend resource snippets, storage access rules, React `generateClient<Schema>()` usage, `observeQuery` usage, and `Authenticator` example were checked against current documentation and compiled successfully in a temporary TypeScript project.
- The article does not include the implementation of `amplify/data/task-stats/handler.ts`; readers would still need to add that Lambda handler for the custom query to deploy and run.
