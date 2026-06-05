# Validation Summary: How to Capture GraphQL Errors in OpenTelemetry Span Events

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GraphQL
- Apollo Server plugins
- OpenTelemetry tracing
- OpenTelemetry metrics
- TypeScript

## Sources Consulted
- GraphQL over HTTP draft, status code guidance: https://graphql.github.io/graphql-over-http/draft/
- GraphQL specification, response and error format: https://spec.graphql.org/October2021/
- Apollo Server plugin event reference: https://www.apollographql.com/docs/apollo-server/integrations/plugins-event-reference
- Apollo Server error handling and built-in error codes: https://www.apollographql.com/docs/apollo-server/data/errors
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript API Span interface: https://open-telemetry.github.io/opentelemetry-js/interfaces/_opentelemetry_api._opentelemetry_api.Span.html
- OpenTelemetry metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/

## Issues Found
- The opening HTTP status code explanation was too broad. GraphQL-over-HTTP distinguishes execution errors from malformed requests and also varies guidance by response media type. Updated the wording to focus on execution errors and partial failures commonly returning HTTP 200.
- The response hook example used Apollo Server plugin lifecycle methods without saying so. Updated the introduction to the code sample to identify Apollo Server as the framework.
- The partial failure check used `data !== null`, which treats missing `data` as present because `undefined !== null` is true. Changed it to `data != null` so errors-only responses are not mislabeled as partial failures.
- The metric description said errors were counted by path, but the sample attributes did not include a path attribute. Updated the description to match the attributes shown.
- The path-cardinality section implied the sample metrics already included `graphql.error.path`. Updated the wording to make it clear this applies if path is added to metrics.

## Review Notes
The OpenTelemetry span event, span status, span attribute, and counter examples use current API shapes. The GraphQL error code classifier matches common Apollo Server extension codes, though custom servers may use different codes.
