# Validation Summary: How to Monitor University Student Information System Registration Flows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry metrics
- Java OpenTelemetry API
- Python OpenTelemetry API
- Student Information System registration monitoring

## Sources Consulted
- OpenTelemetry Java API documentation: https://opentelemetry.io/docs/languages/java/api/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/

## Issues Found
- The first Java snippet used `GlobalOpenTelemetry` without importing it and included unused `Attributes` / `AttributeKey` imports. I added the required `GlobalOpenTelemetry` import, removed the unused imports, and added `Scope` for context management.
- The registration child spans were started while the parent span was not current, so they would not automatically form the described parent-child trace hierarchy. I wrapped the parent and child spans with `makeCurrent()` scopes, matching the OpenTelemetry Java context model.
- The child spans were ended only after successful method calls, which could leak spans if `checkEligibility`, `checkPrerequisites`, or `reserveSeat` threw an exception. I moved each child span end call into a `finally` block.
- The course search Java snippet used OpenTelemetry classes without imports. I added the required Java imports and made the search span current around the work it represents.
- The Python observable gauge was created without a callback. OpenTelemetry Python asynchronous instruments report values from callbacks, so I added a callback that yields an `Observation`.

## Review Notes
The custom `sis.*` attribute names are technically valid for application-specific telemetry, but they are not OpenTelemetry semantic convention attributes. In a production implementation, avoid recording personally identifiable information such as raw student IDs unless retention, access controls, and privacy policies explicitly allow it.
