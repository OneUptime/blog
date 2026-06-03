# Validation Summary: How to Use Amplify DataStore for Offline-First Apps

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Amplify DataStore
- AWS AppSync
- Amazon DynamoDB
- GraphQL Transformer `@model` and `@auth`
- JavaScript
- React
- Jest
- Amplify Hub events

## Sources Consulted
- AWS Amplify Gen 1 DataStore overview: https://docs.amplify.aws/gen1/react/build-a-backend/more-features/datastore/
- AWS Amplify Gen 1 JavaScript DataStore manipulating data: https://docs.amplify.aws/gen1/javascript/build-a-backend/more-features/datastore/manipulate-data/
- AWS Amplify Gen 1 DataStore syncing and selective sync: https://docs.amplify.aws/gen1/nextjs/prev/build-a-backend/more-features/datastore/sync-to-cloud/
- AWS Amplify Gen 1 DataStore conflict resolution: https://docs.amplify.aws/gen1/javascript/build-a-backend/more-features/datastore/conflict-resolution/
- AWS AppSync conflict detection and resolution: https://docs.aws.amazon.com/appsync/latest/devguide/conflict-detection-and-resolution.html
- AWS Amplify Gen 1 DataStore events: https://docs.amplify.aws/gen1/react/build-a-backend/more-features/datastore/datastore-events/
- AWS Amplify Hub utility documentation: https://docs.amplify.aws/gen1/vue/build-a-backend/utilities/hub/
- AWS Amplify DataStore migration guidance: https://docs.amplify.aws/gen1/angular/build-a-backend/more-features/datastore/migrate-from-datastore/

## Issues Found
- Updated JavaScript imports from the legacy `aws-amplify` category import style to current Amplify v6 import paths: `aws-amplify/datastore` for DataStore APIs and `aws-amplify/utils` for Hub.
- Added a Gen 1 maintenance-mode caveat. Official Amplify documentation states Gen 1 is in maintenance mode and DataStore migration guidance notes DataStore will no longer receive new features, so the post needed context for 2026 readers.
- Fixed the query example comment. It claimed the results were sorted by priority, but the code only filtered incomplete tasks.
- Added `teamId` to the GraphQL schema because the selective-sync example filters on `task.teamId`; without that field, the snippet would not match the generated model.
- Corrected the conflict-resolution description. Optimistic concurrency does not implement last-writer-wins; AppSync rejects stale writes when versions differ and returns the latest server item for the client to handle.
- Clarified that AppSync conflict strategies are configured with `amplify update api`, while the shown `conflictHandler` is a client-side DataStore handler for rejected mutations.
- Updated the conflict-handler snippet to import `DISCARD`, guard for the `Task` model, and discard conflicts for other models, matching the pattern in AWS Amplify documentation.
- Updated the Jest mock target to `aws-amplify/datastore` so it matches the corrected import path.

## Review Notes
DataStore remains technically valid for existing Amplify Gen 1 apps, but new projects should evaluate Amplify Gen 2 and current AppSync/API-category approaches because DataStore is no longer receiving new features.
