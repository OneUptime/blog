# Validation Summary: How to Use Amplify with Swift (iOS)

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Amplify for Swift
- Amplify CLI Gen 1
- Amazon Cognito authentication
- AWS AppSync GraphQL APIs
- Amazon S3 storage through Amplify Storage
- Swift, SwiftUI, async/await, Swift Package Manager

## Sources Consulted
- AWS Amplify Swift Gen 1 fullstack setup: https://docs.amplify.aws/gen1/swift/start/getting-started/setup/
- AWS Amplify Swift Gen 1 GraphQL API setup: https://docs.amplify.aws/gen1/swift/build-a-backend/graphqlapi/set-up-graphql-api/
- AWS Amplify Swift GraphQLRequest API reference: https://aws-amplify.github.io/amplify-swift/docs/Structs/GraphQLRequest.html
- AWS Amplify Swift Auth sign-out docs: https://docs.amplify.aws/gen1/swift/build-a-backend/auth/sign-out/
- AWS Amplify Swift Storage upload docs: https://docs.amplify.aws/gen1/swift/build-a-backend/storage/upload/
- AWS Amplify Swift Storage download docs: https://docs.amplify.aws/swift/frontend/storage/download-files/
- AWS Amplify Swift Storage list docs: https://docs.amplify.aws/swift/frontend/storage/list-files/
- AWS Amplify Swift StoragePath docs: https://docs.amplify.aws/gen1/swift/build-a-backend/storage/storagepath/
- AWS Amplify Swift StorageListResult API reference: https://aws-amplify.github.io/amplify-swift/docs/Structs/StorageListResult.html
- AWS Amplify Swift Push Notifications setup and Pinpoint notice: https://docs.amplify.aws/gen1/swift/build-a-backend/push-notifications/set-up-push-service/

## Issues Found
- The introduction and metadata said the tutorial added push notifications, but the post only implements Auth, API, and Storage. Removed push notifications from the description and intro to match the actual tutorial scope.
- The backend creation step stated that `amplify push` generates GraphQL model files unconditionally. Updated the wording to clarify that model files are generated when GraphQL code generation is enabled.
- The Storage examples used deprecated `key` and `accessLevel` parameters. Updated upload, download, get URL, and list examples to use `StoragePath.fromIdentityID` and the current `path:` APIs.
- The Storage list return type used `Amplify.StorageListResult.Item`, which is not the documented type name. Changed it to `StorageListResult.Item`.
- The sign-out snippet referenced `AWSCognitoSignOutResult` without importing its plugin module. Added `import AWSCognitoAuthPlugin`.
- The best practice recommending `.private` access level was outdated for current Storage guidance. Updated it to recommend private `StoragePath` usage.

## Review Notes
The post uses Amplify Gen 1 CLI commands. They remain valid for existing Gen 1 workflows, but AWS marks Gen 1 as maintenance mode and recommends Amplify Gen 2 for new projects. The tutorial also assumes a compatible GraphQL schema with `Todo`, `CreateTodoInput`, and generated `AmplifyModels`.
