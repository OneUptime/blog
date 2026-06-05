# Validation Summary: How to Use OpenTelemetry to Detect Brute-Force Authentication Attacks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry Collector configuration
- OpenTelemetry Collector filter processor
- OpenTelemetry Collector attributes processor
- OpenTelemetry Collector OTLP and debug exporters
- GeoIP-based authentication anomaly detection

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector filter processor documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/processor/filterprocessor
- OpenTelemetry Collector logging exporter replacement note: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- OpenTelemetry Collector troubleshooting documentation for debug exporter usage: https://opentelemetry.io/docs/collector/troubleshooting/

## Issues Found
- The authentication code referenced `hash_username()` without defining it. Added a SHA-256 helper that normalizes the username before hashing so the span attribute example is complete and avoids storing raw usernames.
- The authentication code referenced `_count_unique_usernames()` without defining it or storing usernames by source IP. Added per-IP username attempt tracking, cleanup, and a unique-username counting helper so the credential-stuffing detection logic works.
- The `security.auth.attempt_rate` histogram claimed to record attempts per minute but recorded the full five-minute window count. Changed the recorded value to `ip_rate / 5`.
- The login success metric converted a boolean attribute to a string. OpenTelemetry attributes support booleans, so the example now records the native boolean value.
- The Python snippet imported `StatusCode` but did not use it. Removed the unused import.
- The Collector snippet referenced an `otlp` receiver in the pipeline without defining it. Added an OTLP receiver with gRPC and HTTP protocols.
- The Collector filter processor used an older `traces.include.match_type/span_names` shape. Updated it to the documented OTTL filter form under `traces.span`, dropping spans whose names do not match the `security.*` pattern.
- The Collector snippet used the deprecated `logging` exporter and `loglevel` option. Replaced it with the `debug` exporter and `verbosity: basic`.
- The summary claimed the pipeline shows "what credentials are being tried." Removed that claim because credentials should not be emitted in telemetry.

## Review Notes
- The examples still use application-specific placeholder functions such as `block_ip_temporarily()`, `get_geo_location()`, and `calculate_distance()`. That is acceptable for a focused instrumentation article, but a future revision could explicitly label them as application-provided helpers.
- Recording raw source IP addresses as metric attributes can create high-cardinality data and may have privacy implications. The post notes application-level context, but a future revision could discuss hashing, truncation, or backend-specific cardinality controls.
