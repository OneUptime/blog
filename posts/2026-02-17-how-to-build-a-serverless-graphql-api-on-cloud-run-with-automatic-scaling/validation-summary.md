# Validation Summary: How to Build a Serverless GraphQL API on Cloud Run with Automatic Scaling

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Run
- Google Cloud CLI
- GraphQL
- Apollo Server
- Express
- Node.js
- Cloud Firestore
- DataLoader
- Docker

## Sources Consulted
- Apollo Server expressMiddleware API: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- Apollo Server CORS configuration: https://www.apollographql.com/docs/apollo-server/security/cors
- Apollo Server API reference: https://www.apollographql.com/docs/apollo-server/api/apollo-server
- Apollo Server caching and cache hints: https://www.apollographql.com/docs/apollo-server/performance/caching
- Apollo Server 4 to 5 migration notes: https://www.apollographql.com/docs/apollo-server/migration
- Google Cloud SDK gcloud run deploy reference: https://cloud.google.com/sdk/gcloud/reference/run/deploy
- Google Cloud Run source deployment documentation: https://cloud.google.com/run/docs/deploying-source-code
- Google Cloud Run autoscaling documentation: https://cloud.google.com/run/docs/about-instance-autoscaling
- Google Cloud Firestore Node.js client reference: https://cloud.google.com/nodejs/docs/reference/firestore/latest/firestore/firestore
- DataLoader package documentation: https://www.npmjs.com/package/dataloader
- @as-integrations/express5 npm metadata: https://www.npmjs.com/package/@as-integrations/express5

## Issues Found
- The dependency list installed `express` without the Apollo Express integration package while the server used an integration path removed in Apollo Server 5. Updated the install command to include `@as-integrations/express5` and changed the import to `@as-integrations/express5`, matching the current Apollo integration guidance for Express 5.
- The resolver example declared `cancelOrder` in the schema but did not implement it. Added a matching resolver so the documented mutation works.
- The DataLoader section claimed a single batched read, but the code used `Promise.all` with individual Firestore document reads. Updated the code to use Firestore's `getAll(...refs)` API and clarified the wording as a batched read request.
- The cache hint example used `info.cacheControl.setCacheHint`, which is not the current Apollo Server API. Updated it to use `cacheControlFromInfo(info).setCacheHint(...)` from `@apollo/cache-control-types` and added the package to the install commands.
- The query depth limiting example used `graphql-depth-limit` but the dependency was missing from the setup commands. Added it to the install commands.
- The section title and text described response caching, but the example only configured cache hints. Renamed it to "Adding Cache Hints" and clarified that the hints support downstream caching through the `Cache-Control` header.

## Review Notes
The Cloud Run deployment and autoscaling flags are current. The Dockerfile is valid, though future revisions could use `npm ci --omit=dev` instead of `npm ci --production` to follow newer npm wording. The authentication example remains intentionally illustrative and should be replaced with real token verification before production use.
