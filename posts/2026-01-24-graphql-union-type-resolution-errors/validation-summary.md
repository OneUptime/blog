# Validation Summary: How to Fix 'Union Type' Resolution Errors in GraphQL

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- GraphQL union types
- GraphQL abstract type resolution
- Apollo Server resolver maps
- GraphQL.js type resolution behavior
- JavaScript / Node.js resolvers
- TypeScript discriminated unions and type guards

## Sources Consulted
- GraphQL.js documentation: Abstract types in GraphQL.js - https://www.graphql-js.org/docs/abstract-types/
- GraphQL.js API documentation: `GraphQLUnionType`, `GraphQLTypeResolver`, and `GraphQLIsTypeOfFn` - https://graphql.org/graphql-js/type/
- GraphQL documentation: Schemas and Types, Union types, inline fragments, and `__typename` - https://graphql.org/learn/schema/
- Apollo Server documentation: Unions and Interfaces, `__resolveType` resolver behavior - https://www.apollographql.com/docs/apollo-server/schema/unions-interfaces
- Apollo Server documentation: Resolvers, resolving unions and interfaces - https://www.apollographql.com/docs/apollo-server/data/resolvers
- GraphQL Specification, October 2021: inline fragments and abstract type behavior - https://spec.graphql.org/October2021/

## Issues Found
- The post stated that async `resolveType` handling can produce a Promise-related runtime error and advised avoiding async `resolveType` functions. Current GraphQL.js documents `GraphQLTypeResolver` as returning `PromiseOrValue<string | undefined>`, so async type resolvers are supported. I changed the section to explain that async logic works but can be inefficient when repeated database or API calls happen during list resolution.
- The best-practices and conclusion sections said every union type needs a `__resolveType` function. This was too absolute because GraphQL.js can also use `isTypeOf` on possible object types when `resolveType` is not provided. I changed the wording to require reliable runtime type resolution with either `__resolveType` or `isTypeOf`.
- The "complete example" label implied a standalone schema, but the snippet depends on existing application types and scalars such as `User`, `Post`, `Comment`, and `DateTime`. I changed the wording to "fuller example" to avoid implying that the snippet is fully standalone.

## Review Notes
The examples use Apollo Server's resolver-map convention (`__resolveType`) rather than raw GraphQL.js schema construction. That is appropriate for the Node.js/Apollo-style code shown, but future revisions could explicitly mention Apollo Server near the first resolver example.
