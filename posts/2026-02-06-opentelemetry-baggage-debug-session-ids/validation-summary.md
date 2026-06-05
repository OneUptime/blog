# Validation Summary: How to Use OpenTelemetry Baggage to Pass Debug Session IDs Across Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Baggage
- OpenTelemetry Python API
- OpenTelemetry context propagation
- OpenTelemetry Collector tail sampling processor
- W3C Baggage header
- Redis / redis-py
- Python
- YAML

## Sources Consulted
- OpenTelemetry Python baggage API: https://opentelemetry-python.readthedocs.io/en/latest/api/baggage.html
- OpenTelemetry Python propagation documentation: https://opentelemetry.io/docs/languages/python/propagation/
- OpenTelemetry Baggage concept documentation: https://opentelemetry.io/docs/concepts/signals/baggage/
- OpenTelemetry Baggage API specification: https://opentelemetry.io/docs/specs/otel/baggage/api/
- OpenTelemetry Context specification: https://opentelemetry.io/docs/specs/otel/context/
- OpenTelemetry Collector processors documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector tail sampling processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/tailsamplingprocessor
- OpenTelemetry tail sampling sample configuration: https://opentelemetry.io/docs/demo/sample-configurations/tail-sampling-service-criticality/
- W3C Baggage specification: https://www.w3.org/TR/baggage/
- Redis HSET command documentation: https://redis.io/docs/latest/commands/hset/
- redis-py command documentation: https://redis.readthedocs.io/en/stable/commands.html

## Issues Found
- The post implied baggage propagation was unconditional across all downstream services. Updated the wording to clarify that services receive baggage when context propagation is configured and instrumentation injects/extracts the W3C baggage header.
- The first Python snippet called `context.attach(ctx)` without detaching the returned token. Updated it to store the token and call `context.detach(token)` in a `finally` block so baggage does not leak into later work handled by the same execution context.
- The first Python snippet imported `W3CBaggagePropagator` but did not use it. Removed the unused import.
- The Collector section said the Collector samples directly from baggage. Tail sampling `string_attribute` policies match span or resource attributes, not raw baggage headers, so the section was updated to sample on the `debug.session_id` span attribute copied from baggage.
- The tail sampling `string_attribute.values` field was set to an empty list while the comment said it matched any non-empty value. Changed it to the regex value `".+"` with `enabled_regex_matching: true`.
- The Redis session lookup could return `bytes` when redis-py is not configured with `decode_responses=True`, while baggage values should be strings. Updated `get_session_for_user` to decode byte values.
- The API gateway middleware snippet used `baggage` and `context` without imports and also attached baggage without detaching it. Added the imports and wrapped the middleware call in a `try`/`finally` block that detaches the context token.

## Review Notes
- The snippets were checked for Python syntax with `python3 ast.parse`.
- The YAML configuration snippet was parsed successfully with PyYAML.
- The post intentionally uses custom debug attributes such as `debug.session_id`; these are not OpenTelemetry semantic convention attributes, but they are valid custom attributes for this use case.
- The security guidance is correct: baggage can be propagated in HTTP headers and can be visible to downstream or third-party services, so sensitive data should not be placed in baggage.
