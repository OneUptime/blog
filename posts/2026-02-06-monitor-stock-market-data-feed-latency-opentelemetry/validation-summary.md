# Validation Summary: How to Monitor Stock Market Data Feed Latency from Exchange to Trading Platform

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python API and SDK
- OpenTelemetry OTLP gRPC exporters
- Python tracing and metrics instrumentation
- NTP clock offset monitoring with `ntpq`
- Market data feed latency monitoring

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporter documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python Metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- NTP `ntpq` documentation: https://www.ntp.org/documentation/4.2.8-series/ntpq/
- NTP troubleshooting FAQ for `ntpq -p` offset units: https://www.ntp.org/ntpfaq/ntp-s-trouble/

## Issues Found
- The tracing setup imported and used `BatchSpanExporter`, which is not the current OpenTelemetry Python span processor API. Changed it to `BatchSpanProcessor`, matching the official exporter examples.
- The observable gauge callback returned a bare numeric value through an undefined `get_current_lag()` helper. Added a small backing value, defined `get_current_lag()`, and changed the callback to return an iterable of `Observation` objects as required by OpenTelemetry Python.
- The NTP observable gauge used `metrics.Observation()` without importing `Observation` in the setup snippet. Imported `Observation` from `opentelemetry.metrics` and used it consistently.
- The histogram description said "platform receipt" while the sample records the timestamp after processing completes. Updated the description to say "platform processing completion" to match the code and surrounding explanation.
- The market data description said exchange feeds deliver "trade confirmations." Changed this to "trade reports" because execution confirmations are generally order/execution flow rather than market data feed content.

## Review Notes
- The Python snippets are syntactically valid after the fixes, assuming the placeholder application functions and tick object fields shown in the post are supplied by the reader's market data handler.
- The `ntpq -p` parsing example is intentionally simplified and depends on classic `ntpd` output. Deployments using chrony, systemd-timesyncd, NTPsec, or managed time services may need a different offset source.
- The post uses per-symbol metric attributes. This can be useful for trading dashboards, but high symbol cardinality should be managed carefully in production observability backends.
