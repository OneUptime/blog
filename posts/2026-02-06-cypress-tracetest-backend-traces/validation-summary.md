# Validation Summary: How to Use Cypress with Tracetest to Verify Backend Trace Behavior from

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Cypress
- Tracetest
- OpenTelemetry
- OpenTelemetry Collector
- Docker Compose
- GitHub Actions
- JavaScript
- YAML

## Sources Consulted
- Tracetest Docs: Welcome and architecture overview: https://docs.tracetest.io/
- Tracetest Docs: Tracetest Core installation and server port: https://docs.tracetest.io/core/getting-started/overview
- Tracetest Docs: OpenTelemetry Collector trace ingestion configuration: https://docs.tracetest.io/configuration/connecting-to-data-stores/opentelemetry-collector
- Tracetest Docs: OpenAPI definition for test run endpoints and response shape: https://docs.tracetest.io/openapi
- Tracetest GitHub docs/examples: trace ID test trigger and `${var:TRACE_ID}` usage: https://github.com/kubeshop/tracetest
- Cypress Docs: Custom commands: https://docs.cypress.io/api/cypress-api/custom-commands
- Cypress Docs: `cy.env()` command: https://docs.cypress.io/api/commands/env
- Cypress Docs: `cy.request()` command: https://docs.cypress.io/api/commands/request
- Docker Docs: Compose file `version` field is obsolete: https://docs.docker.com/reference/compose-file/version-and-name/
- Docker Docs: `docker compose up --wait`: https://docs.docker.com/reference/cli/docker/compose/up/
- OpenTelemetry Docs: Collector configuration model: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Docs: HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Docs: Database semantic conventions: https://opentelemetry.io/docs/specs/semconv/database/database-spans/

## Issues Found
- The Docker Compose example omitted the Postgres service required by the Tracetest server defaults. Added a Postgres service, healthcheck, and Tracetest dependency.
- The Compose example used the obsolete top-level `version: '3.8'` field. Removed it to match the current Compose Specification.
- The Tracetest image used `latest`, which makes the tutorial non-repeatable. Pinned the example to `kubeshop/tracetest:v1.7.1`, the latest published Tracetest OSS release found during review.
- The Compose command included `serve`, but the Tracetest image entrypoint already runs `/app/tracetest-server serve`. Changed the command to pass only `--config /app/config.yaml`.
- The Tracetest config snippet incorrectly suggested a `telemetry.exporters.collector` server configuration to read traces from the Collector. Replaced it with a valid server Postgres config, an OpenTelemetry Collector OTLP exporter to `tracetest:4317`, and a Tracetest `DataStore` resource with `type: otlp`.
- The Compose example would have created a host port conflict by exposing `4317` from both Tracetest and the Collector. Kept host `4317` on the Collector only and used the Compose service name for Collector-to-Tracetest traffic.
- The trace ID Tracetest definition was missing the required `traceid.id` value. Added `traceid.id: ${var:TRACE_ID}`.
- The Cypress custom command triggered a Tracetest trace-id test without passing a trace ID. Updated it to accept `traceId` and pass it as the `TRACE_ID` run variable.
- The Cypress custom command assumed Tracetest assertion failures were a flat list. Updated the failure mapping to use the nested `result.results[].results[]` shape documented in the OpenAPI response.
- The Cypress test verified a Tracetest trace after the UI flow but did not correlate it to the frontend request. Added interception of the order API call and extraction of a trace ID from `traceparent` or `x-trace-id` response headers before calling `cy.verifyTrace`.
- The CI workflow used the Tracetest CLI without installing or configuring it, and did not apply the datastore resource. Added CLI installation, server configuration, and datastore application steps.

## Review Notes
The trace assertions are example-specific and depend on the application emitting the stated span names and custom attributes. The post now states the response-header assumption needed for Cypress to obtain the trace ID.
