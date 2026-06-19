# Validation Summary: How to Handle Authorization in GraphQL Resolvers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GraphQL
- Apollo Server with Express
- Node.js
- TypeScript
- GraphQL resolvers and schema directives
- GraphQL Tools
- GraphQL Shield
- TypeGraphQL

## Sources Consulted
- Apollo Server expressMiddleware API documentation: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- Apollo Server error handling documentation: https://www.apollographql.com/docs/apollo-server/data/errors
- GraphQL authorization guidance: https://graphql.org/learn/authorization/
- GraphQL.js nullability documentation: https://www.graphql-js.org/docs/nullability/
- GraphQL Tools schema directives documentation: https://the-guild.dev/graphql/tools/docs/schema-directives
- GraphQL Shield repository and npm package metadata/source for v7.6.5: https://github.com/maticzav/graphql-shield
- TypeGraphQL authorization documentation: https://typegraphql.com/docs/authorization.html

## Issues Found
- The Apollo Server Express example omitted `await server.start()` and the Express JSON/CORS middleware required by the current `expressMiddleware` setup. Updated the snippet to start the server, create an Express app, use `cors`, use `express.json()`, and type `ApolloServer` with the resolver context.
- Several TypeScript resolver examples checked `context.isAuthenticated` but then accessed `context.user`, which is still typed as nullable. Updated those guards to also check `context.user`.
- The schema directive example marked `User.email` as non-null while the `@owner` directive resolver intentionally returns `null` for unauthorized viewers. Changed the field to nullable because GraphQL raises an execution error when a non-null field resolves to `null`.
- The directive implementation checked `context.isAuthenticated` but then accessed `context.user`. Added explicit `context.user` checks before role, permission, and owner logic.
- The GraphQL Shield example used an ownership rule based on `parent` for root `Query` and `Mutation` fields. Root fields do not receive the loaded resource as `parent`, so the rule would not correctly authorize order access. Added a `canAccessOrder` rule that loads order ownership/organization metadata using `args.id`.
- The GraphQL Shield configuration used `fallbackRule: allow` despite the post recommending deny-by-default authorization. Changed the fallback rule to `deny`.
- The GraphQL Shield comment said unauthorized fields would return `null`, but the configured fallback error throws an authorization error. Updated the comment and best-practice wording to distinguish nullable-field hiding from authorization errors.
- The TypeGraphQL `me` resolver accessed `context.user.id` even though TypeScript still sees `user` as nullable after decorator-based authorization. Updated it to use a non-null assertion after `@Authorized()`.

## Review Notes
The examples remain illustrative and assume project-local symbols such as `db`, `UpdateUserInput`, `NotFoundError`, schema `typeDefs`, and resolver classes are defined elsewhere. Apollo Server documentation recommends GraphQL error codes and standard GraphQL error responses over relying on HTTP status codes for resolver errors, even though Apollo supports `extensions.http.status`.
