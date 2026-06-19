# Validation Summary: How to Fix 'Input Coercion' Errors in GraphQL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GraphQL schema and input coercion
- GraphQL scalar, enum, list, non-null, and input object types
- GraphQL.js custom scalars
- Apollo Server error formatting
- GraphQL Tools schema mapping
- JavaScript and TypeScript client-side validation examples

## Sources Consulted
- GraphQL Specification, September 2025: https://spec.graphql.org/September2025/
- GraphQL.js custom scalars documentation: https://www.graphql-js.org/docs/custom-scalars/
- Apollo Server error handling documentation: https://www.apollographql.com/docs/apollo-server/data/errors
- Apollo Server custom scalars documentation: https://www.apollographql.com/docs/apollo-server/schema/custom-scalars
- GraphQL Tools schema directives documentation: https://the-guild.dev/graphql/tools/docs/schema-directives

## Issues Found
- The introduction incorrectly said input coercion errors happen during the parsing phase. Updated it to say they happen during validation and input coercion before resolver execution, which matches the GraphQL execution model.
- The inline enum example used a quoted string literal (`"SUPERUSER"`). GraphQL enum literals are unquoted names, while strings may be used for enum values in common variable transport formats such as JSON. Updated the inline example to `role: SUPERUSER`.
- The Apollo Server `formatError` example used the older single-argument shape and read fields from that argument as if it were both the formatted error and original error. Updated the example to use `(formattedError, error)` and read response-facing fields from `formattedError`.
- The validation directive example declared support for both `INPUT_FIELD_DEFINITION` and `ARGUMENT_DEFINITION`, but only mapped input object fields. Updated the transformer to apply the same validation metadata helper to both `MapperKind.INPUT_OBJECT_FIELD` and `MapperKind.ARGUMENT`.

## Review Notes
The list coercion section is technically correct: GraphQL input coercion wraps a non-null, non-list input value as a one-item list for list input types. The custom scalar examples follow the current GraphQL.js `GraphQLScalarType` API. The directive example still stores validation metadata only; a production implementation would need resolver or scalar-level runtime enforcement that reads those extensions.
