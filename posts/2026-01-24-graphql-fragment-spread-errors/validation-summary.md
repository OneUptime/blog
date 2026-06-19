# Validation Summary: How to Fix 'Fragment Spread' Errors in GraphQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GraphQL fragments and validation rules
- GraphQL union and interface selections
- Apollo Client
- GraphQL Code Generator
- TypeScript

## Sources Consulted
- GraphQL Specification, October 2021: https://spec.graphql.org/October2021/
- GraphQL.js validation API: https://www.graphql-js.org/api-v16/validation/
- Apollo Client useFragment API reference: https://www.apollographql.com/docs/react/api/react/useFragment
- Apollo Client data masking announcement for Apollo Client 3.12: https://www.apollographql.com/blog/more-resilient-code-with-data-masking-in-apollo-client-3-12
- Apollo Client GraphQL Codegen guide: https://www.apollographql.com/docs/react/development-testing/graphql-codegen
- GraphQL Code Generator typescript-react-apollo plugin docs: https://the-guild.dev/graphql/codegen/plugins/typescript/typescript-react-apollo

## Issues Found
- The fragment masking section said "Apollo Client 3" broadly supports fragment masking. Apollo's data masking feature was introduced in Apollo Client 3.12 and requires `dataMasking: true`, so the text and code comments were updated to reflect that.
- The Apollo Client example used `useQuery` without importing it. Added `useQuery` to the import from `@apollo/client`.
- The debugging utility typed the `schema` parameter as `GraphQLSchema` without importing that type. Added `GraphQLSchema` to the `graphql` import.
- The masking example said `data.email` would be undefined. With data masking and generated types, the more precise statement is that the field is not exposed by the masked fragment type, so the comment was corrected.
- The masking example said the parent component has access to all fields. With data masking enabled, it has access to fields selected directly by the parent query, so the comment was corrected and `id` was selected directly for the list key.

## Review Notes
The GraphQL validation examples align with the specification rules for known fragment names, possible fragment spreads, no fragment cycles, fragments on composite types, and unique fragment names. The GraphQL Code Generator configuration shown uses a supported plugin, although Apollo's current documentation also highlights newer client-preset based workflows.
