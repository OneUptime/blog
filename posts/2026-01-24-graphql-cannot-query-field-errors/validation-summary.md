# Validation Summary: How to Fix 'Cannot Query Field' Errors in GraphQL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- GraphQL schema definition language and validation
- GraphQL introspection
- GraphQL fragments, interfaces, and selection sets
- GraphQL.js parsing and validation APIs
- Apollo Server, Apollo Sandbox, and Apollo Studio Explorer
- GraphQL Tools schema directives and schema stitching
- Apollo Client with TypeScript
- Relay Compiler
- GraphQL Code Generator
- get-graphql-schema CLI

## Sources Consulted
- GraphQL Specification, October 2021: https://spec.graphql.org/October2021/
- GraphQL Learn: Validation: https://graphql.org/learn/validation/
- GraphQL Learn: Schemas and Types: https://graphql.org/learn/schema/
- GraphQL.js validation API: https://www.graphql-js.org/api-v16/validation/
- Apollo Server landing page plugin documentation: https://www.apollographql.com/docs/apollo-server/api/plugin/landing-pages
- Apollo Server API reference: https://www.apollographql.com/docs/apollo-server/api/apollo-server
- Apollo Sandbox documentation: https://www.apollographql.com/docs/graphos/platform/sandbox
- GraphQL Tools schema directives documentation: https://the-guild.dev/graphql/tools/docs/schema-directives
- Relay Compiler documentation: https://relay.dev/docs/guides/compiler/
- GraphQL Code Generator installation documentation: https://the-guild.dev/graphql/codegen/docs/getting-started/installation
- get-graphql-schema CLI help output via `npx --yes get-graphql-schema --help`

## Issues Found
- The fragment example used a `posts` root field without defining it in the accompanying schema. Added `type Query { posts: [Post!]! }` so the example produces the intended fragment-spread validation error instead of an unrelated missing root-field error.
- The authorization example claimed conditional field availability based on arguments and showed a field present in the schema. Corrected the section to distinguish role-specific schemas, which can produce "Cannot query field", from resolver-time authorization, which returns `null` or an authorization error after validation.
- The custom directive SDL omitted the directive declaration and role enum. Added `directive @auth(requires: Role!) on FIELD_DEFINITION` and `enum Role` so the schema snippet is valid SDL.
- The directive resolver returned `null` for a non-null `String!` field and called `resolve(...)` even when no custom resolver exists. Made `email` nullable and used GraphQL's `defaultFieldResolver` fallback.
- The Apollo Server IDE example used the deprecated/removed `playground: true` option. Updated it to mention Apollo Sandbox / Apollo Studio Explorer and show the current `introspection` setting instead.
- The React example contained JSX in a `typescript` code fence. Changed that fence to `tsx`.
- The required-argument error reference was abbreviated and omitted the non-null marker and "but it was not provided" wording. Updated it to match common GraphQL validation wording more closely.

## Review Notes
The remaining examples are intentionally illustrative and assume surrounding server setup, generated types, package installation, or project scripts where appropriate. `npm run graphql-codegen` is valid when the project defines that script, `relay-compiler` is still a valid compiler command, and `get-graphql-schema ENDPOINT_URL > schema.graphql` matched the CLI help output. A local attempt to validate selected snippets with a temporary `graphql` package was blocked because the package runner did not expose the installed package to Node's `require()` path in this workspace, so final verification relied on official documentation and CLI help output.
