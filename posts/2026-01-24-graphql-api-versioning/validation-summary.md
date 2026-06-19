# Validation Summary: How to Handle Versioning in GraphQL APIs

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- GraphQL schema design and SDL
- GraphQL deprecation and schema evolution
- JavaScript resolver examples
- Apollo Server plugin lifecycle hooks
- npm semver
- GraphQL Inspector CLI
- GitHub Actions
- Mermaid diagrams

## Sources Consulted
- GraphQL Specification, draft: https://spec.graphql.org/draft/
- GraphQL Specification, October 2021 descriptions: https://spec.graphql.org/October2021/#sec-Descriptions
- Apollo Server plugin event reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo GraphOS schema deprecations guide: https://www.apollographql.com/docs/graphos/schema-design/guides/deprecations
- GraphQL Inspector diff command documentation: https://the-guild.dev/graphql/inspector/docs/commands/diff
- npm semver documentation: https://docs.npmjs.com/cli/v6/using-npm/semver/
- GitHub Actions checkout action: https://github.com/actions/checkout
- GitHub Actions setup-node action: https://github.com/actions/setup-node

## Issues Found
- The `semver.parse()` example used `try/catch` for invalid client versions. According to semver documentation, `parse(v)` returns a `SemVer` object or `null`, so invalid versions would not be logged. Updated the code to check for a falsy parsed value.
- The schema registry example called `this.getSchema()` but did not define it. Added a small `getSchema()` method that reads and parses the stored schema version.
- The migration-guide SDL block used nested triple-backtick fences inside a triple-backtick Markdown code block, which prematurely closed the outer block. Changed the outer fence to four backticks and corrected the inner fence closers.

## Review Notes
- The GraphQL deprecation guidance matches the specification and Apollo's schema deprecation guidance.
- The Apollo Server `willResolveField` hook and GraphQL Inspector `--rule suppressRemovalOfDeprecatedField` examples match current documentation.
- The `Money.amount: Float!` example is syntactically valid, but production payment systems usually prefer integer minor units or decimal-safe representations to avoid floating-point rounding issues.
