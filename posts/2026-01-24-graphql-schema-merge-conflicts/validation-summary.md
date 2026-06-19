# Validation Summary: How to Fix 'Schema Merge' Conflicts in GraphQL

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GraphQL SDL and schema validation
- Apollo Federation
- GraphQL Tools schema stitching
- GraphQL Tools schema merging
- JavaScript
- GitHub Actions

## Sources Consulted
- Apollo Federation entities documentation: https://www.apollographql.com/docs/federation/v1/entities
- Apollo Federation 2 backward compatibility documentation: https://www.apollographql.com/docs/deploy-preview/5c398dc30159acf136a6504d/graphos/schema-design/federated-schemas/reference/backward-compatibility
- GraphQL Tools schema stitching type merging documentation: https://the-guild.dev/graphql/stitching/docs/approaches/type-merging
- GraphQL Tools duplicate types and typeMergingOptions documentation: https://the-guild.dev/graphql/stitching/docs/getting-started/duplicate-types
- GraphQL Tools renaming transforms documentation: https://the-guild.dev/graphql/stitching/docs/transforms/renaming
- GraphQL Tools schema merging documentation: https://the-guild.dev/graphql/tools/docs/schema-merging
- GraphQL Tools merge migration documentation: https://the-guild.dev/graphql/tools/docs/migration/migration-from-merge-graphql-schemas
- GraphQL.js utilities API documentation: https://www.graphql-js.org/api-v16/utilities/

## Issues Found
- The schema stitching example placed per-type merge resolver configuration under `typeMergingOptions.User`, which is not the documented API. I moved the `User` merge configuration into each relevant subschema's `merge` option and kept `typeMergingOptions` for candidate selection.
- The stitching snippet imported `delegateToSchema` but did not use it. I removed the unused import.
- The modular schema merge example imported `mergeTypeDefs` and `mergeResolvers` from `@graphql-tools/schema`. Current GraphQL Tools documentation imports those helpers from `@graphql-tools/merge`, so I corrected the imports.
- Several SDL examples used an undeclared `gql` template tag. I converted them to plain `/* GraphQL */` template strings, which GraphQL Tools accepts directly.
- The validation script attempted to call `printSchema` on the `DocumentNode` returned by `mergeTypeDefs`. `printSchema` expects a `GraphQLSchema`, so I changed the snippet to use `buildASTSchema(merged)` before `validateSchema`.
- The enum conflict example used an unsupported `onTypeConflict` option with `mergeTypeDefs` and included unused custom enum merge code. I replaced it with a documented `mergeTypeDefs` call using `throwOnConflict: true`, relying on GraphQL Tools' enum value consolidation.

## Review Notes
The Apollo Federation examples use Federation 1 SDL syntax (`extend type` and `@external`) that remains compatible with Federation 2 gateways during migration, but teams starting new Federation 2 subgraphs may prefer newer Federation 2 schema patterns where appropriate.
