# Validation Summary: How to Use Pre-Deployment Observability Validation: Ensure OpenTelemetry

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry Collector
- OpenTelemetry JavaScript/Node.js instrumentation
- OpenTelemetry Python instrumentation
- OpenTelemetry Go instrumentation
- OpenTelemetry Java instrumentation
- GitHub Actions
- CI/CD quality gates

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector overview: https://opentelemetry.io/docs/collector/
- OpenTelemetry resource concepts: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/
- OpenTelemetry service semantic convention attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/service/
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python trace API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.html
- OpenTelemetry Go getting started documentation: https://opentelemetry.io/docs/languages/go/getting-started/
- OpenTelemetry Go API package documentation: https://go.opentelemetry.io/otel
- OpenTelemetry Java API documentation for GlobalOpenTelemetry: https://javadoc.io/doc/io.opentelemetry/opentelemetry-api/latest/io/opentelemetry/api/GlobalOpenTelemetry.html
- GitHub Actions workflow syntax documentation: https://docs.github.com/actions/reference/workflows-and-actions/workflow-syntax

## Issues Found
- The post described checking specifically for an OTel SDK dependency, but the examples also accepted OpenTelemetry API packages such as `@opentelemetry/api`, `opentelemetry-api`, and `go.opentelemetry.io/otel`. Changed the wording and CI messages to "API/SDK dependency" so the explanation matches the implemented checks.
- The GitHub Actions dependency check printed a pass message when no supported project manifest was present. Added a `detected` guard so unsupported project types fail instead of passing silently.
- The tracer initialization patterns treated Python `trace.get_tracer` and Java `GlobalOpenTelemetry` as initialization signals. Updated the checks to look for provider setup patterns such as `trace.set_tracer_provider` and `buildAndRegisterGlobal`, which better match official OpenTelemetry initialization guidance.
- The custom validation script called `check_sdk_dependency()` and `check_tracer_init()` without defining those methods, so it would fail at runtime. Added both methods and imported `re` so the script can run.
- Removed unused imports and an unused local variable from the custom validation script while fixing the runtime issue.

## Review Notes
The Collector validation command matches the official `validate --config` form. The examples are intentionally heuristic and should be treated as CI guardrails, not proof of complete instrumentation coverage.
