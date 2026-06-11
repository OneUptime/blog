# Validation Summary: How to Create GraphQL Schema Design

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GraphQL SDL
- GraphQL schemas, object types, scalars, enums, interfaces, unions, input objects, and directives
- Relay Cursor Connections
- JavaScript and Node.js GraphQL resolver examples
- GraphQL Tools schema directive utilities

## Sources Consulted
- GraphQL Specification: https://spec.graphql.org/draft/
- GraphQL Schemas and Types documentation: https://graphql.org/learn/schema/
- GraphQL Cursor Connections Specification: https://relay.dev/graphql/connections.htm
- GraphQL.js cursor-based pagination documentation: https://www.graphql-js.org/docs/cursor-based-pagination/
- GraphQL Tools schema directives documentation: https://the-guild.dev/graphql/tools/docs/schema-directives

## Issues Found
- The introduction said every GraphQL schema starts with object types. GraphQL schemas are defined by a type system and root operation types, so this was too absolute. Changed it to say most schemas define object types.
- The pagination resolver assigned `await query.clone().count()` directly to `totalCount`. Knex-style database clients return count rows, not a bare number, which would not match the declared `Int!` field. Updated the example to destructure the count row and convert it with `Number(count)`.
- The built-in directives section used `@skip` as if it could be applied in a schema type definition. The GraphQL specification defines `@skip` and `@include` for executable documents, while `@deprecated` is valid in type-system definitions. The section now shows `@deprecated` in the schema and moves `@skip`/`@include` into a query example.

## Review Notes
The GraphQL SDL and operation snippets were parsed with the official `graphql` parser, and the JavaScript snippets were checked with `node --check`. The cursor pagination example is technically valid as an educational offset-cursor implementation, but production APIs may prefer stable keyset cursors to avoid consistency issues when records are inserted or deleted between requests.
