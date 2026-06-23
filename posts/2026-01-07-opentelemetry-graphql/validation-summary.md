# Validation Summary: How to Instrument GraphQL APIs with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry GraphQL and HTTP instrumentation
- Apollo Server
- GraphQL Yoga
- Envelop OpenTelemetry plugin
- GraphQL.js
- DataLoader
- TypeScript / Node.js

## Sources Consulted
- OpenTelemetry JavaScript Node.js getting started: https://opentelemetry.io/docs/languages/js/getting-started/nodejs/
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript SDK API docs: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry GraphQL semantic conventions: https://opentelemetry.io/docs/specs/semconv/registry/attributes/graphql/
- `@opentelemetry/resources` and `@opentelemetry/semantic-conventions` package exports from npm
- `@opentelemetry/instrumentation-graphql` package documentation: https://www.npmjs.com/package/@opentelemetry/instrumentation-graphql
- Apollo Server plugin event reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo Server `expressMiddleware` API reference: https://www.apollographql.com/docs/apollo-server/api/express-middleware
- GraphQL Yoga plugin documentation: https://the-guild.dev/graphql/yoga-server/docs/features/envelop-plugins
- GraphQL Yoga quick start: https://the-guild.dev/graphql/yoga-server/docs
- Envelop `useOpenTelemetry` package documentation and npm package typings: https://the-guild.dev/graphql/envelop/plugins/use-open-telemetry
- GraphQL.js documentation: https://www.graphql-js.org/docs/
- DataLoader repository documentation: https://github.com/graphql/dataloader

## Issues Found
- The tracing setup used the old `Resource` constructor and `SEMRESATTRS_*` constants. Updated it to `resourceFromAttributes` with current `ATTR_SERVICE_NAME`, `ATTR_SERVICE_VERSION`, and `ATTR_DEPLOYMENT_ENVIRONMENT_NAME` constants.
- The Apollo custom plugin stored the GraphQL query under `graphql.query`. Updated it to `graphql.document`, matching the current OpenTelemetry GraphQL semantic convention.
- The Yoga section installed and imported `@graphql-yoga/plugin-opentelemetry`, which is not published in npm. Updated it to use the maintained `@envelop/opentelemetry` package, which works with GraphQL Yoga and supports the shown `variables` and `result` options.
- Removed unused OpenTelemetry API imports from examples after checking the current code.
- The resolver error-tracking wrapper called `span.end()` in both `catch` and `finally`. Removed the duplicate call so each span is ended once.

## Review Notes
- The examples are tutorial/demo code and still use mock database calls and simplified query-complexity logic. For production, teams should prefer a mature complexity-limit package or expand the AST traversal to handle inline fragments, variables for pagination limits, and interface/union types.
- Resolver-level tracing is technically valid but can create high-cardinality, high-volume traces. The post already warns about overhead and sensitive data exposure.
