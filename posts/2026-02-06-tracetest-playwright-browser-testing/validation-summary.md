# Validation Summary: How to Use Tracetest with Playwright for End-to-End Trace-Based Browser Testing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry
- Tracetest
- Tracetest Agent
- Playwright
- TypeScript
- Docker Compose
- GitHub Actions

## Sources Consulted
- Tracetest Playwright integration docs: https://docs.tracetest.io/tools-and-integrations/playwright/
- Tracetest Core overview and install docs: https://docs.tracetest.io/core/getting-started/overview
- Tracetest Core server configuration docs: https://docs.tracetest.io/core/configuration/server
- Tracetest server provisioning docs: https://docs.tracetest.io/core/configuration/provisioning
- `@tracetest/playwright` package README and type declarations: https://www.npmjs.com/package/@tracetest/playwright
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry JavaScript propagation docs: https://opentelemetry.io/docs/languages/js/propagation/
- W3C Trace Context specification: https://www.w3.org/TR/trace-context/
- Playwright browser installation docs: https://playwright.dev/docs/browsers
- Docker Compose `up` CLI reference: https://docs.docker.com/reference/cli/docker/compose/up/
- GitHub `actions/upload-artifact` documentation: https://github.com/actions/upload-artifact

## Issues Found
- The Docker Compose example used `kubeshop/tracetest:latest` with `TRACETEST_DEV=true` but did not include the PostgreSQL configuration required by Tracetest Core docs, nor did it configure a trace data store. I changed the stack to the documented Tracetest Agent pattern for the Playwright package flow and pointed the app's OTLP exporter to the agent.
- The Playwright example used nonexistent or incorrect `@tracetest/playwright` APIs: synchronous `Tracetest()`, `tracetest.configure(...)`, and `tracetest.runTest()` without a test object. I changed it to the documented async factory, token/server configuration, `capture(...)`, and `summary()` flow.
- The Tracetest test definition file was referenced through an unsupported `testFile` option. I changed the example to load the YAML file with `readFileSync` and pass it as the Tracetest run definition.
- The post claimed the Playwright test "captures a trace ID"; the package actually injects a W3C `traceparent` and registers the trace ID with Tracetest. I updated the explanation accordingly.
- The trace propagation section imported an unused `trace` symbol and implied browser propagation happens automatically with any browser SDK. I removed the unused import and clarified that the Tracetest Playwright integration injects `traceparent`; manual OpenTelemetry `propagation.inject(...)` remains valid for application code.
- The CI example omitted required Tracetest secrets for the agent and package, and used an unverified local `/api/tests` request to collect results. I added the required Tracetest environment variables and changed the final step to upload the Playwright report with `actions/upload-artifact`.
- The CI example ran Playwright commands without first installing project dependencies. I added `npm ci` before installing Playwright browsers.

## Review Notes
The corrected article follows the older `@tracetest/playwright` package approach, which Tracetest documents separately from the newer Playwright Engine trigger. Future updates could compare those two approaches, but that would be a content expansion rather than a correctness fix.
