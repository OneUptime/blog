# Validation Summary: How to Use Express with GraphQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Express
- Node.js
- GraphQL
- Apollo Server
- Apollo Server Express middleware
- GraphQL subscriptions with graphql-ws
- graphql-upload
- DataLoader
- JSON Web Tokens
- Jest and Supertest
- Express rate limiting

## Sources Consulted
- Apollo Server expressMiddleware API: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- Apollo Server context documentation: https://www.apollographql.com/docs/apollo-server/data/context
- Apollo Server subscriptions documentation: https://www.apollographql.com/docs/apollo-server/data/subscriptions
- Apollo Server integration testing documentation: https://www.apollographql.com/docs/apollo-server/testing/testing
- Apollo Server cache control plugin documentation: https://www.apollographql.com/docs/apollo-server/api/plugin/cache-control
- Apollo Server file upload documentation: https://www.apollographql.com/docs/apollo-server/v3/data/file-uploads
- graphql-ws recipes and package exports: https://the-guild.dev/graphql/ws/recipes
- graphql-upload package exports: https://www.npmjs.com/package/graphql-upload
- GraphQL Tools schema directives documentation: https://the-guild.dev/graphql/tools/docs/schema-directives
- DataLoader documentation: https://github.com/graphql/dataloader
- GraphQL schema and type system documentation: https://graphql.org/learn/schema/
- express-rate-limit documentation: https://express-rate-limit.mintlify.app/quickstart/usage

## Issues Found
- The installation and Express setup used Apollo Server 4's built-in Express 4 integration path and `body-parser`. Updated the install command to include `@as-integrations/express5`, changed imports to `@as-integrations/express5`, and used `express.json()` to match current Apollo Server and Express documentation.
- The authentication directive example referenced `mapSchema`, `MapperKind`, `getDirective`, and `defaultFieldResolver` without importing them. Added the required imports from `@graphql-tools/utils` and `graphql`.
- The subscriptions example imported `useServer` from the outdated `graphql-ws/lib/use/ws` path and did not drain the HTTP server. Updated the import to `graphql-ws/use/ws` and added `ApolloServerPluginDrainHttpServer({ httpServer })`.
- The file upload examples imported `graphql-upload` from the package root, which is not exported by current `graphql-upload` versions. Updated the snippets to use the package's explicit ESM exports for `graphqlUploadExpress` and `GraphQLUpload`.
- The upload resolver imported `mkdir` from `fs` and awaited it as if it were the promise API. Updated the example to import `mkdir` from `fs/promises`.
- The upload resolver used `__dirname` after switching to ESM imports. Replaced that with `path.resolve('uploads')` in both the upload path and static file middleware examples.
- The testing example imported deprecated `apollo-server-testing` even though it used `ApolloServer.executeOperation`. Removed the unused deprecated import.
- The cache-control schema snippet used `@cacheControl` without defining the directive. Added the required `CacheControlScope` enum and `@cacheControl` directive definition.
- The rate limiting example used the older default import style and `max` option naming. Updated it to the documented CommonJS named import and `limit` option.

## Review Notes
The article is now aligned with current Apollo Server 5 and Express 5 documentation. Some examples remain intentionally illustrative and depend on application-specific helpers such as data source classes, `uploadToStorage`, and `createTestServer`.
