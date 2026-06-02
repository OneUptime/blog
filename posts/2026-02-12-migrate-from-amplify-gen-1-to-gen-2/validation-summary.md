# Validation Summary: How to Migrate from Amplify Gen 1 to Gen 2

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- AWS Amplify Gen 1
- AWS Amplify Gen 2
- AWS Amplify CLI and `ampx`
- Amazon Cognito
- AWS AppSync
- Amazon DynamoDB
- Amazon S3
- AWS Lambda
- TypeScript
- React / JavaScript frontend configuration
- CloudFormation and AWS CDK

## Sources Consulted
- AWS Amplify Gen 2 migration guide: https://docs.amplify.aws/react/start/migrate-to-gen2/migrate-existing-app/
- AWS Amplify Gen 2 feature parity and custom pipeline guidance: https://docs.amplify.aws/javascript/start/migrate-to-gen2/feature-matrix/
- AWS Amplify Gen 2 existing Cognito resources guide: https://docs.amplify.aws/react/build-a-backend/auth/use-existing-cognito-resources/
- AWS Amplify Gen 2 connect to existing AWS resources guide: https://docs.amplify.aws/react/frontend/connect-to-existing-resources/
- AWS Amplify Gen 2 custom S3 bucket guide: https://docs.amplify.aws/vue/frontend/storage/use-with-custom-s3/
- AWS Amplify Gen 2 storage setup guide: https://docs.amplify.aws/swift/build-a-backend/storage/set-up-storage/
- AWS Amplify Gen 2 function configuration guide: https://docs.amplify.aws/react/build-a-backend/functions/configure-functions/
- OneUptime linked Amplify Gen 2 article: https://oneuptime.com/blog/post/2026-02-12-build-a-full-stack-app-with-amplify-gen-2/view

## Issues Found
- The post recommended manually creating a Gen 2 project with `npm create amplify@latest` for migration. Updated this to the official `amplify gen2-migration assess`, `lock`, and `generate` workflow, which generates Gen 2 code from the deployed Gen 1 environment.
- The `referenceAuth` example omitted required authenticated and unauthenticated IAM role ARNs and imported an unused `defineAuth`. Updated the example to match the documented `referenceAuth` requirements.
- The data section claimed `defineData({ name: ... })` points to an existing AppSync API. Corrected this because `defineData` creates/names a Gen 2 data resource; existing AppSync APIs should be connected through client configuration, while Gen 1 migration uses generated Gen 2 code and refactor.
- The directive mapping listed `a.secondaryIndexes()` as the Gen 2 equivalent of `@key`. Updated it to the documented model-level `.secondaryIndexes((index) => [index('fieldName')])` style.
- The `@searchable` row implied direct Gen 2 support through custom configuration. Updated it to note that `@searchable` is not directly supported and requires a custom OpenSearch integration.
- The storage section claimed `defineStorage` can reference an existing S3 bucket. Corrected it to explain that normal `defineStorage` provisions Amplify-managed storage; migration uses the refactor flow, and frontend-only external bucket usage requires explicit client configuration and IAM permissions.
- The sandbox, deploy, and cleanup sections skipped migration-specific refactor and retain steps. Added the documented `npx ampx sandbox --once`, `amplify gen2-migration refactor`, and `amplify gen2-migration retain` guidance, and warned against premature `amplify env remove` or direct stack deletion.

## Review Notes
The post is now technically aligned with the current AWS Amplify Gen 2 migration documentation. The migration tooling is marked as developer preview in the official docs, so future reviews should re-check this article if AWS changes the supported migration workflow.
