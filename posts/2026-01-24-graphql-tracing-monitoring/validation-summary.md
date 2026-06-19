# Validation Summary: How to Configure GraphQL Tracing and Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GraphQL
- Apollo Server
- TypeScript
- Express
- Prometheus and prom-client
- OpenTelemetry JS
- graphql-query-complexity
- Grafana, Jaeger, and Tempo

## Sources Consulted
- Apollo Server plugin event reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo Server plugin guide: https://www.apollographql.com/docs/apollo-server/integrations/plugins
- OpenTelemetry JS NodeSDK documentation: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_sdk-node.html
- OpenTelemetry JS resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JS SDK 2.x upgrade guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- prom-client README: https://github.com/siimon/prom-client
- graphql-query-complexity package documentation: https://www.npmjs.com/package/graphql-query-complexity
- graphql-query-complexity directive estimator documentation: https://github.com/slicknode/graphql-query-complexity/blob/master/src/estimators/directive/README.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found
- The first Apollo Server tracing example declared `willResolveField` as `async`. Apollo documents `willResolveField` and its end hook as synchronous plugin APIs, so the example was changed to a synchronous function.
- The OpenTelemetry setup used `new Resource(...)`, which is outdated for OpenTelemetry JS SDK 2.x. It was changed to `resourceFromAttributes(...)`.
- The OpenTelemetry setup imported `SemanticResourceAttributes`, which is not the current recommended import style for stable semantic convention constants. It now imports `ATTR_SERVICE_NAME` and `ATTR_SERVICE_VERSION`, and uses the current `deployment.environment.name` resource attribute.
- The OpenTelemetry resolver span example passed a `parent` property inside span options. The OpenTelemetry JS API expects the parent context as the third `startSpan` argument, so the example now uses `trace.setSpan(context.active(), span)` as the third argument.
- The OpenTelemetry environment resource attribute could be `undefined` when `NODE_ENV` is unset. It now falls back to `development`.
- The query complexity example used `fieldExtensionsEstimator()` while the schema used SDL `@complexity` directives. It was changed to `directiveEstimator()`, which matches the documented SDL directive approach.
- The schema example used `@complexity` without declaring the directive. The SDL now includes the `directive @complexity(...) on FIELD_DEFINITION` declaration.
- The Prometheus alert examples referenced `graphql_query_complexity_bucket`, but the metrics example did not define a query complexity histogram. A `graphql_query_complexity` histogram was added.
- The complete server example used `crypto.randomUUID()` without importing `crypto`. It now imports `randomUUID` from `node:crypto` and calls it directly.

## Review Notes
The examples remain illustrative and omit surrounding application code such as schema definitions, resolver implementations, package installation, and module exports. For production use, operation-name labels should be bounded or normalized to avoid high-cardinality metrics.
