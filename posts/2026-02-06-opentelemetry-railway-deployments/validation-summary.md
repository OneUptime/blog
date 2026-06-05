# Validation Summary: How to Configure OpenTelemetry for Railway Deployments

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Node.js auto-instrumentation
- OTLP/HTTP trace and metrics exporters
- OpenTelemetry Collector
- Railway deployments, private networking, variables, and deployment teardown
- Node.js

## Sources Consulted
- OpenTelemetry JavaScript repository and current setup examples: https://github.com/open-telemetry/opentelemetry-js
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry configuration data model environment variable substitution: https://opentelemetry.io/docs/specs/otel/configuration/data-model/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Railway variables reference: https://docs.railway.com/variables/reference
- Railway private networking documentation: https://docs.railway.com/private-networking
- Railway deployments reference: https://docs.railway.com/deployments/reference
- Railway deployment teardown documentation: https://docs.railway.com/deployments/deployment-teardown
- Railway CLI variable documentation: https://docs.railway.com/cli/variable
- OneUptime OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The OpenTelemetry resource example used `new Resource(...)`. Current OpenTelemetry JS 2.x examples use `resourceFromAttributes(...)` from `@opentelemetry/resources`, so the import and resource construction were updated.
- The install command omitted `@opentelemetry/api`, even though later examples import `trace`, `metrics`, and `SpanStatusCode` from that package. The package was added explicitly.
- The Railway environment name was shown as `RAILWAY_ENVIRONMENT`. Railway documents `RAILWAY_ENVIRONMENT_NAME` and `RAILWAY_ENVIRONMENT_ID`, so the code and explanatory text now use `RAILWAY_ENVIRONMENT_NAME`.
- The manual span example ended the span only on the successful path and used a numeric status code. The example now uses `SpanStatusCode.ERROR`, records exceptions, rethrows errors, and ends the span in a `finally` block.
- The text implied all outgoing HTTP requests are automatically propagated by the SDK in general. It now states that OpenTelemetry's HTTP and Undici instrumentations inject W3C Trace Context for supported clients.
- The Railway redeployment section implied there is always a graceful shutdown grace period and that zero-downtime overlap always happens. Railway currently documents a default 0-second SIGTERM-to-SIGKILL draining window and configurable overlap, so the wording was corrected and `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` was mentioned.

## Review Notes
- The OpenTelemetry Collector configuration shape, OTLP/HTTP receiver port `4318`, `otlphttp` exporter, and `batch` processor settings are consistent with current Collector documentation.
- Railway private networking hostnames under `railway.internal` and use of the service hostname plus listening port are consistent with Railway documentation.
- A local smoke test against current npm packages confirmed the corrected OpenTelemetry imports and constructors load successfully.
