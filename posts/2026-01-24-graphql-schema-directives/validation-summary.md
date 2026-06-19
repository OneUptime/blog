# Validation Summary: How to Configure GraphQL Schema Directives

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- GraphQL schema and executable directives
- GraphQL SDL directive locations
- GraphQL Tools schema transforms
- Apollo Server
- GraphQL.js resolver and error APIs
- Node.js
- Redis / ioredis
- Day.js

## Sources Consulted
- GraphQL Specification, Directives: https://spec.graphql.org/October2021/#sec-Language.Directives
- Apollo Server docs, Directives: https://www.apollographql.com/docs/apollo-server/schema/directives
- Apollo Server docs, Error handling: https://www.apollographql.com/docs/apollo-server/data/errors
- Apollo Server docs, startStandaloneServer: https://www.apollographql.com/docs/apollo-server/api/standalone
- Apollo Server docs, expressMiddleware: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- GraphQL Tools docs, Schema Directives: https://the-guild.dev/graphql/tools/docs/schema-directives
- GraphQL.js docs, Resolver Anatomy: https://www.graphql-js.org/docs/resolver-anatomy/
- Redis command docs, SET and SETEX: https://redis.io/docs/latest/commands/set/ and https://redis.io/docs/latest/commands/setex/
- Day.js docs, Format: https://day.js.org/docs/en/display/format

## Issues Found
- The examples used deprecated Apollo Server v2/v3 package imports (`apollo-server`, `apollo-server-express`) and old Apollo error classes. Updated the examples to use `@apollo/server`, `startStandaloneServer`, `expressMiddleware`, and `GraphQLError` with `extensions.code`.
- The auth directive stored type-level directive state by mutating GraphQL object types. Updated it to track type-level directive arguments in a map, matching the GraphQL Tools schema-transform pattern.
- The validation directives declared support for `INPUT_FIELD_DEFINITION`, but the implementation only validated top-level resolver arguments. Added recursive input-object/list validation for `@length`, `@pattern`, and `@range`.
- The `@range` directive was declared and used in the schema but had no transformer implementation or combined-server registration. Added `rangeDirectiveTransformer` and included it in the combined directive setup.
- The Redis cache example used `SETEX`, which Redis documents as deprecated. Updated it to use `SET` with the `EX` option.
- Some resolver-wrapping directives skipped fields that did not define custom resolvers. Updated those wrappers to use GraphQL.js `defaultFieldResolver` where appropriate.

## Review Notes
The snippets were checked against official documentation and all JavaScript code blocks were syntax-checked with Node's parser. The examples were not executed end-to-end because this blog utility package does not install GraphQL, Apollo Server, GraphQL Tools, Redis, or Day.js dependencies.
