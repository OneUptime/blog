# Validation Summary: How to Use OpenTelemetry to Debug Clock Skew Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry tracing
- OpenTelemetry Collector transform processor
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry Python SDK resources
- chrony and `chronyc tracking`
- NTP and PTP time synchronization
- Kubernetes node time synchronization

## Sources Consulted
- OpenTelemetry specification overview, tracing signal and span model: https://opentelemetry.io/docs/specs/otel/overview/
- OpenTelemetry resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Python SDK `Resource.create` documentation: https://opentelemetry-python.readthedocs.io/en/stable/sdk/resources.html
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector contrib OTTL span context paths: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- chrony `chronyc tracking` documentation: https://chrony-project.org/doc/4.7/chronyc.html

## Issues Found
- The `get_clock_resource()` example called `get_last_ntp_sync_time()` without defining it. Added a small helper that reads the `Ref time` line from `chronyc tracking`.
- The `get_ntp_offset()` example parsed the numeric `System time` value but ignored whether chrony reported the clock as `slow` or `fast`. Updated the parser so `slow` returns a negative offset and `fast` remains positive.
- The skew detector comment said same service spans imply the same clock. That is not generally true when the same service has replicas on different hosts, so the comment now describes the actual service-pair filtering behavior.
- The Collector transform snippet used ambiguous OTTL paths (`attributes` and `start_time`). Updated it to current span-context paths: `span.attributes` and `span.start_time_unix_nano`, and added `error_mode: ignore`.

## Review Notes
The detection examples assume trace data has already been normalized into a simplified dictionary shape with flattened resource attributes and nanosecond timestamps. Real OTLP JSON uses nested resource spans and `start_time_unix_nano` / `end_time_unix_nano` style fields, so production code would need an adapter for the backend export format.
