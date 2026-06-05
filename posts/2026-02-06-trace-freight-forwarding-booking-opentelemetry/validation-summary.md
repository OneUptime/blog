# Validation Summary: How to Trace Freight Forwarding Quote and Booking Workflows Across Multi

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Python
- asyncio
- OpenTelemetry Python tracing API
- OpenTelemetry OTLP gRPC span exporter
- OpenTelemetry metrics API
- OpenTelemetry HTTP semantic conventions
- Freight forwarding carrier API integrations

## Sources Consulted
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python exporters documentation: https://opentelemetry.io/docs/languages/python/exporters/
- OpenTelemetry Python OTLP exporter API documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/

## Issues Found
- The OTLP gRPC exporter was configured with an `http://otel-collector:4317` endpoint but did not pass `insecure=True`. The official OpenTelemetry Python OTLP gRPC example uses `insecure=True` for a non-TLS collector endpoint, so the tracer setup was updated accordingly.
- The HTTP API call span used older HTTP semantic convention attributes: `http.method`, `http.url`, and `http.status_code`. These were updated to the current stable HTTP span attributes `http.request.method`, `url.full`, and `http.response.status_code`.
- Error marking used the legacy generic `error` boolean attribute. OpenTelemetry's current semantic conventions reserve `error.type` for error classification, so failed carrier API calls now set `error.type` to the response status code and rejected bookings set `error.type` to `booking_rejected`.

## Review Notes
The examples remain illustrative and assume application-specific helpers such as `get_active_carriers`, `CarrierAPIError`, `load_quote`, and `BookingResult` exist. The metrics section correctly creates OpenTelemetry instruments, but it does not show calls to record histogram or counter measurements.
