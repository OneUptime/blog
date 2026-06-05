# Validation Summary: How to Build Synthetic Transaction Tests

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Tracetest monitors, tests, test suites, CLI, and datastore configuration
- OpenTelemetry Collector pipelines, filter processor, attributes processor, and OTLP
- OpenTelemetry HTTP semantic conventions
- Python cleanup script using requests, schedule, time, and os
- Slack incoming webhook-style alerts

## Sources Consulted
- Tracetest Jaeger datastore documentation: https://docs.tracetest.io/configuration/connecting-to-data-stores/jaeger
- Tracetest OTLP ingestion endpoint documentation: https://docs.tracetest.io/configuration/connecting-to-data-stores/otlp-ingestion-endpoint
- Tracetest monitor configuration documentation: https://docs.tracetest.io/cli/configuring-monitors
- Tracetest running test suites documentation: https://docs.tracetest.io/cli/running-test-suites
- Tracetest synthetic monitoring API tests recipe: https://docs.tracetest.io/examples-tutorials/recipes/synthetic-monitoring-trace-based-api-tests
- Tracetest upstream repository examples and generated OpenAPI models: https://github.com/kubeshop/tracetest
- OpenTelemetry Collector telemetry transformation documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry HTTP semantic convention registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- Python os module documentation: https://docs.python.org/3/library/os.html

## Issues Found
- The datastore example configured `type: otlp` with an `endpoint` and `tls` block. Tracetest documents OTLP ingestion as a datastore type without those fields, while querying a production trace backend such as Jaeger uses an endpoint. Changed the example to a documented Jaeger datastore configuration.
- The monitor webhook omitted the documented `events` field and HTTP `method`. Added `events: [FAILED]` and `method: POST` so the alert definition matches Tracetest monitor configuration and Slack-style webhook behavior.
- The multi-step transaction section claimed to chain multiple API calls but only showed a single `Test`. Added a minimal `TestSuite` example and the documented `tracetest apply testsuite` command.
- The Collector filtering example used an opt-in HTTP request header attribute as if it were guaranteed and as if one pipeline selected only synthetic spans. Updated it to filter on an explicit `synthetic_test` span or resource attribute, and added the complementary filter for the synthetic pipeline.
- The Python cleanup script used `os.environ` without importing `os`. Added the missing `import os`.
- The monitor health commands used an unsupported-looking `tracetest list runs --monitor` command and assumed a `.runs` array on `get monitor`. Replaced them with documented `tracetest list monitor` and `tracetest get monitor --id ... --output json` commands.

## Review Notes
The examples still depend on application-specific span names and custom attributes such as `order.id`, `cart.id`, and `inventory.updated`. Those are reasonable for a tutorial, but readers must ensure their instrumentation emits those attributes and that synthetic spans are tagged consistently before using the Collector filtering example.
