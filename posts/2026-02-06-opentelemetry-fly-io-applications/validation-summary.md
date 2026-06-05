# Validation Summary: How to Set Up OpenTelemetry on Fly.io Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript SDK
- OpenTelemetry OTLP HTTP exporters
- OpenTelemetry custom spans and metrics
- Fly.io Machines, secrets, private networking, and health checks
- Docker and Node.js
- npm

## Sources Consulted
- OpenTelemetry JavaScript resources documentation: https://opentelemetry.io/docs/languages/js/resources/
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Fly.io Machine runtime environment documentation: https://fly.io/docs/machines/runtime-environment/
- Fly.io app configuration reference: https://fly.io/docs/reference/configuration/
- Fly.io health checks documentation: https://fly.io/docs/reference/health-checks/
- Fly.io process groups documentation: https://fly.io/docs/launch/processes/
- Fly.io private networking documentation: https://fly.io/docs/networking/private-networking/
- Fly.io secrets documentation: https://fly.io/docs/apps/secrets/
- npm ci documentation: https://docs.npmjs.com/cli/commands/npm-ci/
- Node.js command-line documentation: https://nodejs.org/docs/latest/api/cli.html

## Issues Found
- The OpenTelemetry initialization snippet used `new Resource(...)` from `@opentelemetry/resources`, which is not exported by current OpenTelemetry JavaScript packages. Changed it to `resourceFromAttributes(...)`, matching the current official JavaScript resources documentation.
- The dependency install command omitted `@opentelemetry/api` even though the custom instrumentation snippet imports it directly. Added `@opentelemetry/api` to the install command.
- The Dockerfile used `npm ci --only=production`. Updated it to the current `npm ci --omit=dev` form documented by npm.
- The custom span example could leave nested spans open if validation or database writes threw errors. Wrapped the nested span work in `try` / `finally` blocks so the child spans always end.
- The custom span example set error status with the numeric value `2`. Changed it to `SpanStatusCode.ERROR`, matching the official OpenTelemetry JavaScript examples.
- The custom metric attributes could pass an undefined Fly region outside Fly.io. Added the same `unknown` fallback used elsewhere in the post.
- The Collector section described Fly.io process groups as running within the same Machine. Fly.io process groups run in their own Machines, so the wording was corrected and the heading was changed from sidecar-specific wording.
- The health-check snippet used `[[services.http_checks]]` even though the preceding app config used `[http_service]`. Changed it to `[[http_service.checks]]` with duration strings and uppercase `GET`, matching Fly.io's current examples.
- The health-check text said the endpoint should verify the OpenTelemetry SDK is initialized, but the shown endpoint only returned app and Fly.io runtime context. Updated the text and comment to accurately describe the example.

## Review Notes
- The post is technically relevant and remains a valid Fly.io/OpenTelemetry setup guide after the fixes.
- The OTLP examples use explicit `/v1/traces` and `/v1/metrics` exporter URLs, which is valid for OTLP/HTTP exporters. In future revisions, the post could mention that OpenTelemetry exporters can also read standard OTLP environment variables directly.
