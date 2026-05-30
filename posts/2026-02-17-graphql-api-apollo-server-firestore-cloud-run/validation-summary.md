# Validation Summary: How to Build a GraphQL API with Apollo Server and Firestore on Cloud Run

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Cloud Firestore
- Apollo Server
- GraphQL
- Express
- Node.js
- DataLoader
- Google Cloud CLI

## Sources Consulted
- Apollo Server previous versions documentation: https://www.apollographql.com/docs/apollo-server/previous-versions
- Apollo Server Express middleware documentation: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- Apollo Server getting started documentation: https://www.apollographql.com/docs/apollo-server/getting-started
- Cloud Firestore Node.js client documentation: https://docs.cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/firestore
- Cloud Firestore indexing documentation: https://firebase.google.com/docs/firestore/query-data/index-overview
- Google Cloud Buildpacks Node.js documentation: https://docs.cloud.google.com/docs/buildpacks/nodejs
- gcloud run deploy command reference: https://docs.cloud.google.com/sdk/gcloud/reference/run/deploy
- npm package metadata for @apollo/server, @as-integrations/express5, express, graphql, @google-cloud/firestore, and dataloader.

## Issues Found
- Apollo Server 4 was end-of-life as of January 26, 2026. Updated the post text and code to Apollo Server 5, including the official `@as-integrations/express5` middleware package.
- The original CommonJS examples were no longer compatible with the current Apollo Server 5 package metadata. Updated the setup to use ES modules and converted the code samples to `import`/`export`.
- The Cloud Run source deployment example did not configure a Node.js start script or Node version. Added `npm pkg set scripts.start="node server.js"` and `npm pkg set engines.node=">=20"` to match Apollo Server 5 and Google Cloud Buildpacks behavior.
- The Firestore client used a placeholder `projectId`, which would override application default credentials in Cloud Run unless the user manually set `PROJECT_ID`. Updated it to `new Firestore()` so the client uses ADC as documented.
- The DataLoader section created a loader but did not show the resolver update needed to use it. Added the `Task.assignee` resolver change that loads users through `loaders.userLoader`.
- The DataLoader code claimed `getAll` supports up to 500 documents at once, but the official Node.js client reference does not document that limit for `getAll`. Removed the unsupported limit claim.
- The schema exposed `totalCount` while the resolver returned only the current page size. Renamed the field to `count` to reflect the value actually returned.
- Firestore filtered queries combined equality filters with `orderBy('createdAt', 'desc')` and may require composite indexes. Added a note telling readers to create the composite indexes Firestore suggests.

## Review Notes
The tutorial is technically valid after these fixes. For a more production-focused future revision, it could add authentication, stricter input validation, graceful HTTP server shutdown with Apollo's drain plugin, and explicit Firestore index definitions.
