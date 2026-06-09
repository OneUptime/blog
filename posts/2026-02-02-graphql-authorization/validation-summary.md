# Validation Summary: How to Implement Authorization in GraphQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GraphQL
- Apollo Server v4 (`@apollo/server`, `@apollo/server/express4`)
- `@graphql-tools/utils` (schema directive transformers)
- `@graphql-tools/schema` (`makeExecutableSchema`)
- `jsonwebtoken` (JWT verification)
- Node.js / Express
- Mongoose-style models (used illustratively)

## Sources Consulted
- Apollo Server v4 error handling docs: https://www.apollographql.com/docs/apollo-server/data/errors
- Apollo Server v4 `expressMiddleware` API: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- GraphQL Tools schema directives guide: https://the-guild.dev/graphql/tools/docs/schema-directives
- `jsonwebtoken` README (auth0/node-jsonwebtoken): https://github.com/auth0/node-jsonwebtoken
- GraphQL spec: directive definitions and locations (FIELD_DEFINITION)

## Issues Found
- **Deprecated/removed error classes from Apollo Server v3**: The `auth-helpers.js` example threw `AuthenticationError` and `ForbiddenError` without any import. These classes were exported from `apollo-server-errors` / `apollo-server-express` in Apollo Server v3 but were removed in Apollo Server v4 (`@apollo/server`), which the post uses elsewhere in its setup. As written the code would throw a `ReferenceError`. **Fix**: Replaced both with `throw new GraphQLError(message, { extensions: { code: 'UNAUTHENTICATED' | 'FORBIDDEN', http: { status: 401 | 403 } } })` imported from `graphql`, which is the v4-recommended replacement per the Apollo error-handling docs. Added the corresponding `require('graphql')` import.

## Review Notes
- The `expressMiddleware` setup correctly calls `await server.start()` before mounting, which is required in Apollo Server v4.
- The directive transformer pattern using `mapSchema`, `MapperKind.OBJECT_FIELD`, and `getDirective(...)?.[0]` matches the official `@graphql-tools` schema-directives documentation, including the `defaultFieldResolver` fallback.
- `jwt.verify(token, secret)` is correctly used synchronously (no callback) and wrapped in try/catch — accurate per the `jsonwebtoken` API.
- The "Putting It All Together" example calls `User.findById(user.id)` inside the `me` resolver without first verifying `user` is non-null. Because that field is guarded by `@auth`, the directive transformer will reject unauthenticated requests before the resolver runs, so this is correct as written — not a bug, but worth knowing the directive ordering matters.
- The post does not show the standard `cors()` / `express.json()` middleware that `expressMiddleware` typically requires; this is a stylistic omission focused on auth, not a technical inaccuracy.
- The `@hasRole` directive only checks a single role. For real-world apps with role hierarchies or multiple acceptable roles, a `roles: [String!]!` argument would be more flexible — minor design observation, not an error.
