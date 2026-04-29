# Validation Summary: How to Monitor GraphQL Server IPv6 Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apollo Server 4 (`@apollo/server`)
- GraphQL
- Prometheus (`prom-client`)
- Grafana / PromQL
- Apollo Studio (Usage Reporting plugin)
- Express
- pino-http (structured logging)
- Node.js IPv6 socket binding (`::`)

## Sources Consulted
- Apollo Server 4 plugin event reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo Server 4 Usage Reporting plugin: https://www.apollographql.com/docs/apollo-server/api/plugin/usage-reporting
- Apollo Server 4 Inline Trace plugin: https://www.apollographql.com/docs/apollo-server/api/plugin/inline-trace
- `@apollo/server` request pipeline type definitions: https://unpkg.com/@apollo/server@4/dist/cjs/externalTypes/requestPipeline.d.ts
- `@apollo/server-plugin-operation-registry` package: https://registry.npmjs.org/@apollo/server-plugin-operation-registry
- `prom-client` README: https://github.com/siimon/prom-client
- Prometheus `histogram_quantile` and `rate` documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
1. **Incorrect import in `server.js`**: The post imported `createPrometheusPlugin` from `@apollo/server-plugin-operation-registry`. That package is for operation safelisting/registry only and does **not** export anything called `createPrometheusPlugin`. It also imported `makeExecutableSchema` from `@graphql-tools/schema` and `ApolloServerPluginInlineTrace` from `@apollo/server/plugin/inlineTrace`, neither of which were used in the example. Removed all three bogus/unused imports, leaving only the actually-used `ApolloServer` import.
2. **Missing import in Apollo Studio Integration block**: The example used `ApolloServerPluginUsageReporting` without importing it. Added the correct import: `const { ApolloServerPluginUsageReporting } = require('@apollo/server/plugin/usageReporting');`.

## Review Notes
- Apollo Server 4 plugin lifecycle (`requestDidStart` returning a listener with `willSendResponse`, accessing `response.body.singleResult.errors`) is correct. The `singleResult` shape is only valid when `response.body.kind === 'single'`; for incremental delivery (`@defer`/`@stream`) the body is `initialResult`/`subsequentResults` instead. The optional-chaining (`response.body?.singleResult?.errors`) safely no-ops in that case, so it does not cause crashes — but operations using incremental delivery will silently not have errors counted. Worth noting if the reader uses `@defer`/`@stream`.
- The Grafana query labelled "Compare IPv6 vs IPv4 error rates" only computes the IPv6 error rate; comparing to IPv4 would require a second expression with `ipVersion="ipv4"`. Left as-is since the user can trivially adapt it and the post's intent (per-IP-version error rate) is conveyed.
- `metricsApp.listen(9090, '::')` binds dual-stack on Linux by default; on systems with `IPV6_V6ONLY=1` it would only accept IPv6. Acceptable for the tutorial's IPv6 focus.
- `prom-client` package and the `Histogram`/`Counter`/`Gauge`/`register` exports are correct.
- `pino-http` `customLogLevel` signature `(res, err)` is the documented form.
