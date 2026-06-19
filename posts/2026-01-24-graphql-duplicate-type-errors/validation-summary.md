# Validation Summary: How to Fix 'Duplicate Type' Errors in GraphQL Schema

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- GraphQL SDL and schema validation
- GraphQL.js AST parsing
- GraphQL Tools schema merging, resolver merging, file loading, schema stitching, and transforms
- TypeGraphQL
- Nexus
- Apollo Federation
- Node.js
- TypeScript

## Sources Consulted
- GraphQL Specification, October 2021: https://spec.graphql.org/October2021/
- GraphQL Tools schema merging documentation: https://the-guild.dev/graphql/tools/docs/schema-merging
- GraphQL Tools schema loading documentation: https://the-guild.dev/graphql/tools/docs/schema-loading
- GraphQL Tools schema stitching renaming transforms documentation: https://the-guild.dev/graphql/stitching/docs/transforms/renaming
- TypeGraphQL bootstrapping documentation: https://typegraphql.com/docs/bootstrap.html
- TypeGraphQL argument and input validation documentation: https://typegraphql.com/docs/validation.html
- Nexus makeSchema API documentation: https://nexusjs.org/docs/api/make-schema
- Apollo Federation directives reference: https://www.apollographql.com/docs/graphos/schema-design/federated-schemas/reference/directives

## Issues Found
- The SDL module example used `DateTime` in the `User` type without declaring the scalar in the shown schema. Added `scalar DateTime` to the base schema snippet so the combined SDL is valid.
- The TypeGraphQL schema example described `validate: true` as duplicate-type validation. TypeGraphQL documents `validate` as class-validator integration for resolver arguments and inputs, while duplicate GraphQL type names are caught during schema construction. Updated the comment to reflect that behavior.
- The TypeScript TypeGraphQL snippets used class properties without definite assignment assertions and included an unused `Mutation` import and unused resolver parameters. Added `!` to GraphQL model properties, removed the unused import, and prefixed unused parameters with `_` so the snippets compile more cleanly under common TypeScript settings.

## Review Notes
The federation example uses `extend type` and `@external`, which remains valid federation syntax, although Apollo Federation 2 no longer requires type extensions in all cases. The schema merging and Nexus examples align with current official documentation.
