# Validation Summary: How to Fix 'Type Mismatch' Errors in GraphQL Schema

## Status
validated

## Post Type
Tutorial / debugging guide

## Technologies Covered
- GraphQL schemas and type system
- GraphQL result coercion and execution errors
- GraphQL.js custom scalars
- Apollo Server plugins and error handling
- JavaScript
- TypeScript

## Sources Consulted
- GraphQL Specification, September 2025: https://spec.graphql.org/September2025/
- GraphQL.js documentation, Custom Scalars: https://www.graphql-js.org/docs/custom-scalars/
- GraphQL.js documentation, Abstract Types: https://www.graphql-js.org/docs/abstract-types/
- Apollo Server documentation, Unions and Interfaces: https://www.apollographql.com/docs/apollo-server/schema/unions-interfaces
- Apollo Server documentation, Plugin Event Reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo Server documentation, Error Handling: https://www.apollographql.com/docs/apollo-server/data/errors

## Issues Found
- The scalar mismatch section stated that returning the wrong JavaScript scalar type is always the core error. The GraphQL specification leaves result coercion details to implementations as long as the final serialized value satisfies the scalar contract. I updated the wording to explain implementation-specific result coercion and changed the problematic `Int` example from a numeric string to a non-serializable string.
- The key takeaway "Match scalar types exactly" overstated the GraphQL result coercion rules. I changed it to recommend returning canonical scalar values and avoiding reliance on implementation-specific coercion.
- The Apollo Server debugging plugin inspected `response.errors` inside `willSendResponse`. Apollo Server documents `didEncounterErrors` as the lifecycle hook where GraphQL errors are available on `requestContext.errors`. I updated the example to use `didEncounterErrors`.

## Review Notes
The remaining examples are broadly accurate for current GraphQL, GraphQL.js, and Apollo Server usage. The runtime validation middleware is a development aid and should not be treated as a replacement for GraphQL execution's built-in completion, scalar serialization, enum validation, and abstract type resolution.
