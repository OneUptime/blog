# Validation Summary: How to Instrument OpenAPI/Swagger Validated Requests with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript API
- OpenTelemetry metrics and tracing
- Express.js middleware
- express-openapi-validator
- OpenAPI/Swagger schema validation
- Ajv JSON Schema validation
- Prometheus/PromQL

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Prometheus client-library compatibility documentation: https://opentelemetry.io/docs/compatibility/prometheus/client-libraries/
- express-openapi-validator validateRequests documentation: https://cdimascio.github.io/express-openapi-validator-documentation/usage-validate-requests/
- express-openapi-validator validateResponses documentation: https://cdimascio.github.io/express-openapi-validator-documentation/usage-validate-responses/
- express-openapi-validator options summary: https://cdimascio.github.io/express-openapi-validator-documentation/usage-options-summary/
- Ajv options documentation: https://ajv.js.org/options.html

## Issues Found
- The setup snippet defined `validateRequests` twice. In JavaScript object literals, the later property overwrites the earlier one, so `validateRequests: true` was ineffective. I removed the duplicate and kept the documented object form with `allowUnknownQueryParameters`.
- The setup snippet said `express-openapi-validator` would not reject invalid requests, but the library validates and rejects failures by default. I changed the comment to state that the built-in validator rejects invalid requests and that the custom middleware is the non-rejecting approach.
- The install command omitted `ajv`, even though later snippets import it directly. I added `ajv` as a direct dependency.
- The post used only `@opentelemetry/api` in the install command without noting that applications must initialize an OpenTelemetry SDK/exporter to emit telemetry. I added a short prerequisite note.
- The custom validation snippet used `metrics`, `validationErrors`, `validationDuration`, and `validRequests` without defining them in that file. I added the missing OpenTelemetry metrics import and metric declarations.
- The custom validation snippet referenced `findPathSpec` without a declaration. I added a TypeScript declaration to make clear that this route-to-spec lookup is application-provided.
- The response validation snippet used `Ajv`, `trace`, `metrics`, `validationErrors`, and `findResponseSchema` without imports or declarations. I added the missing imports, metric declaration, and helper declaration.
- The dashboard compliance query divided valid requests by valid requests plus individual violations. Because one invalid request can generate multiple violations, this was not a true request compliance rate. I added an `api.schema.invalid_requests` counter and changed the query to use valid plus invalid request counts.

## Review Notes
- The examples still leave route/spec lookup helpers as application-specific placeholders, which is reasonable for a focused blog post but should be implemented carefully for Express route parameters and OpenAPI path templates.
- The custom Ajv examples use plain JSON Schema compilation; production OpenAPI validation may need additional handling for `$ref`, OpenAPI-specific schema features, and formats depending on the spec.
