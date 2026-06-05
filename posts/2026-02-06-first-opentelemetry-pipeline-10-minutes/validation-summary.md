# Validation Summary: How to Set Up Your First OpenTelemetry Pipeline in 10 Minutes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry Node.js auto-instrumentation
- OpenTelemetry Collector
- OTLP HTTP and OTLP gRPC
- Jaeger all-in-one
- Node.js
- Express
- Docker Compose

## Sources Consulted
- OpenTelemetry JavaScript documentation: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript instrumentation guide: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript resources guide: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector troubleshooting documentation: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- Jaeger deployment documentation: https://www.jaegertracing.io/docs/1.76/deployment/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/
- Docker Compose version and name documentation: https://docs.docker.com/reference/compose-file/version-and-name/
- npm package metadata for current Express and OpenTelemetry packages, checked with `npm view`

## Issues Found
- The post listed Node.js v16+ as sufficient, but the current Express package requires Node.js `>=18` and OpenTelemetry JavaScript supports active or maintenance LTS Node versions. Updated the prerequisite and verification comment to v18+.
- The Docker Compose example used the obsolete top-level `version: '3.8'` field. Removed it to match the current Compose Specification.
- The commands used legacy `docker-compose`. Updated them to `docker compose`, the current Docker Compose CLI form.
- The Collector config used the deprecated/removed `logging` exporter. Replaced it with the `debug` exporter and updated the troubleshooting text.
- The OpenTelemetry setup imported `Resource` from `@opentelemetry/resources` and constructed it with `new Resource(...)`, which fails with current packages. Updated the examples to use `resourceFromAttributes(...)`.
- The examples used older semantic convention access patterns and the outdated `deployment.environment` key in the production snippet. Updated them to current `ATTR_*` constants, including `ATTR_DEPLOYMENT_ENVIRONMENT_NAME`.
- The install command omitted direct dependencies that the code imports. Added `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`, and `@opentelemetry/sdk-trace-base`.
- The custom span/context propagation example used `startSpan` plus `context.with(context.active())`, which did not make the created span active and was not the recommended pattern for nested manual spans. Updated the examples to use `tracer.startActiveSpan(...)`.
- The distributed tracing note was too broad. Narrowed it to supported instrumented HTTP clients.
- The metrics next-step wording implied installing `@opentelemetry/sdk-metrics` alone exports metrics. Clarified that a metric reader must be added.

## Review Notes
The updated OpenTelemetry JavaScript imports, SDK construction, sampler construction, and `startActiveSpan` callback pattern were smoke-tested against current npm packages in a temporary project. The Docker/Jaeger pipeline configuration was reviewed against official documentation but not run end-to-end. For future maintenance, consider pinning Docker images instead of using `latest` for more reproducible tutorials.
