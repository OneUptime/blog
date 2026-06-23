# Validation Summary: How to Implement Trace-Based Testing with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript API and SDK
- OpenTelemetry Python API and SDK
- OpenTelemetry semantic conventions
- Tracetest
- Jest and pytest
- GitHub Actions
- GitLab CI
- Jaeger

## Sources Consulted
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JS SDK 2.x migration guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry JS typed API documentation: https://open-telemetry.github.io/opentelemetry-js/
- OpenTelemetry Python in-memory span exporter source: https://github.com/open-telemetry/opentelemetry-python/blob/main/opentelemetry-sdk/src/opentelemetry/sdk/trace/export/in_memory_span_exporter.py
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry database semantic conventions: https://opentelemetry.io/docs/specs/semconv/db/database-spans/
- Tracetest test definition documentation: https://docs.tracetest.io/cli/creating-tests
- Tracetest test specification documentation: https://docs.tracetest.io/cli/creating-test-specifications
- Tracetest CLI running tests documentation: https://docs.tracetest.io/cli/running-tests
- GitHub Actions service container documentation: https://docs.github.com/actions/tutorials/communicating-with-docker-service-containers
- GitHub Actions artifact documentation: https://docs.github.com/en/actions/tutorials/store-and-share-data
- GitLab CI services documentation: https://docs.gitlab.com/ci/services/

## Issues Found
- The JavaScript OpenTelemetry setup used `new Resource(...)`, `SemanticResourceAttributes`, and `provider.addSpanProcessor(...)`. These are outdated for OpenTelemetry JS SDK 2.x. Updated the setup to use `resourceFromAttributes(...)`, current semantic convention constants, and the `spanProcessors` provider constructor option.
- Several JavaScript helpers used `span.parentSpanId`, which was replaced by `span.parentSpanContext?.spanId` in OpenTelemetry JS SDK 2.x. Updated parent lookup logic across the helper, structure validation, performance critical-path, and error propagation examples.
- The span tree helper assumed a root span must have no parent at all. That can fail when an active test span is not yet exported or when the captured span set starts below a parent. Updated the logic to treat spans with no captured parent as roots of the captured tree.
- HTTP and database assertion examples used older semantic convention attributes such as `http.status_code`, `http.method`, `db.system`, `db.statement`, and `db.name`. Updated examples to current stable names such as `http.response.status_code`, `http.request.method`, `db.system.name`, `db.query.text`, and `db.namespace`.
- The semantic convention best-practice snippet referenced `SemanticAttributes` without importing it and used outdated constants. Replaced it with current imports from `@opentelemetry/semantic-conventions`.
- One JavaScript snippet used top-level `await` in a CommonJS-style context. Wrapped it in an async Jest test example so the snippet is syntactically valid.
- The GitHub Actions PR comment linked to `http://localhost:16686`, which would not be reachable by readers after the CI job. Updated the comment text to point to the uploaded trace artifact instead.

## Review Notes
- JavaScript and Python code blocks were syntax-checked after edits.
- The updated JavaScript tracer setup was tested against current npm packages and successfully exported an in-memory span.
- Some examples are intentionally application-specific and assume the application under test emits the named spans and business attributes.
