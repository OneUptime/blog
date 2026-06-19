# Validation Summary: How to Fix 'Custom Scalar' Serialization Errors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GraphQL
- GraphQL.js
- GraphQL custom scalars
- TypeScript
- GraphQL Tools
- Jest-style unit testing

## Sources Consulted
- GraphQL.js documentation: Using Custom Scalars - https://www.graphql-js.org/docs/custom-scalars/
- GraphQL.js documentation: Custom Scalars: Best Practices and Testing - https://www.graphql-js.org/docs/advanced-custom-scalars/
- GraphQL Tools documentation: Custom Scalars and Enums - https://the-guild.dev/graphql/tools/docs/scalars
- GraphQL Tools documentation: Executable Schemas - https://the-guild.dev/graphql/tools/docs/generate-schema
- npm package metadata for graphql@17.0.1 - https://www.npmjs.com/package/graphql

## Issues Found
- The URL scalar's `parseValue` implementation only blocked `javascript:` URLs, while the scalar description and `serialize` implementation limited supported protocols to `http:`, `https:`, and `data:`. Updated `parseValue` to enforce the same allowed protocol list.
- The testing example used `GraphQLError` and `Kind` without importing them. Added the missing import from `graphql`.
- The timestamp test fixture did not match the stated ISO timestamp. Replaced `1705315800000`, which serializes to `2024-01-15T10:50:00.000Z`, with `1705314600000`, which serializes to `2024-01-15T10:30:00.000Z`.
- The summary claimed null and undefined should be handled explicitly in all three scalar methods. Adjusted this to say they should be handled consistently where they can reach scalar methods, which better matches GraphQL input coercion behavior.

## Review Notes
- GraphQL.js v17 keeps `serialize`, `parseValue`, and `parseLiteral` as deprecated aliases and introduces `coerceOutputValue`, `coerceInputValue`, and `coerceInputLiteral`. The post remains useful for GraphQL.js v16 and common ecosystem usage, but a future update could add a version note for v17-only projects.
