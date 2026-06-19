# Validation Summary: How to Handle Authentication in GraphQL APIs

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- GraphQL
- Apollo Server
- GraphQL Tools schema directives
- JWT / JSON Web Tokens
- bcryptjs
- Express sessions
- Redis and connect-redis
- Google OAuth ID token verification
- Role-based access control
- express-rate-limit

## Sources Consulted
- Apollo Server migration from v3 to v4/v5: https://www.apollographql.com/docs/apollo-server/migration-from-v3
- Apollo Server error handling: https://www.apollographql.com/docs/apollo-server/data/errors
- Apollo Server context: https://www.apollographql.com/docs/apollo-server/data/context
- Apollo Server standalone API: https://www.apollographql.com/docs/apollo-server/api/standalone
- Apollo Server plugin event reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- GraphQL Tools schema directives: https://the-guild.dev/graphql/tools/docs/schema-directives
- GraphQL Specification, October 2021: https://spec.graphql.org/October2021/
- connect-redis documentation: https://github.com/tj/connect-redis
- node-redis documentation: https://redis.io/docs/latest/develop/clients/nodejs/
- express-session documentation: https://expressjs.com/en/resources/middleware/session/
- Google ID token verification docs: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
- express-rate-limit documentation: https://express-rate-limit.mintlify.app/overview

## Issues Found
- The Apollo Server examples used the deprecated `apollo-server` package, `server.listen()`, and `AuthenticationError` / `ForbiddenError` imports. Updated examples to use `@apollo/server`, `startStandaloneServer`, and `GraphQLError` with Apollo-compatible `extensions.code` values.
- The Apollo Server context was passed to the `ApolloServer` constructor, which is not the current standalone setup pattern. Moved context wiring to `startStandaloneServer`.
- The directive transformer application order contradicted the comment. Updated the order so `@auth` wraps `@hasRole`, causing authentication checks to run before role checks.
- The `flaggedContent` comment claimed admin or moderator access, but the directive implementation only allowed `MODERATOR`. Corrected the comment.
- The GraphQL SDL referenced `Post` without defining it. Added a minimal `Post` type to the schema snippets.
- The `User.email` field was non-null while the field-level resolver returned `null` for unauthorized viewers. Changed `email` to nullable so the resolver behavior is valid GraphQL.
- The JWT example silently fell back to a hardcoded secret. Changed it to require `JWT_SECRET`.
- The session example used an outdated `connect-redis` initialization style and old Redis client options. Updated it to `new RedisStore({ client })`, `redis.createClient({ url })`, and `redisClient.connect()`.
- The session example used `SESSION_SECRET` without validating that it exists. Added an explicit required environment-variable check.
- The session resolver referenced `AuthenticationError` and `verifyCredentials` without imports. Replaced the error with `GraphQLError` and added a credentials helper import.
- The Google OAuth example generated a JWT without importing `generateToken` and did not reject unverified Google email claims. Added the import and an `email_verified` check.
- The RBAC example used `ForbiddenError` without importing it. Replaced it with `GraphQLError` and a `FORBIDDEN` code.
- The rate-limit example described login-only limiting but applied middleware to the whole `/graphql` endpoint. Reworded it as coarse GraphQL request limiting and noted that login/signup should also have stricter resolver-level throttling.
- The Apollo plugin example destructured a non-current `context` argument. Updated it to use `requestContext.contextValue` and made IP extraction work with either Express-style `req.ip` or Node's socket address.

## Review Notes
The examples are now aligned with current Apollo Server v4/v5 patterns and the JavaScript snippets pass `node --check`. A production implementation should still add project-specific concerns such as refresh-token rotation, CSRF protection when using cookies, account lockout or distributed throttling for login mutations, proxy-aware secure-cookie configuration, and database-backed user revalidation for long-lived JWTs.
