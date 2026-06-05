# Validation Summary: Set Up HTTP Endpoint Health Checks Using the OpenTelemetry HTTP Check Receiver

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- HTTP Check receiver
- OTLP exporter
- Resource and batch processors
- PromQL alerting

## Sources Consulted
- OpenTelemetry Collector Contrib HTTP Check receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/httpcheckreceiver/README.md
- OpenTelemetry Collector Contrib HTTP Check receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/httpcheckreceiver/documentation.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector HTTP client configuration documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector Contrib distribution README: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol-contrib/README.md
- OpenTelemetry Prometheus and OpenMetrics compatibility specification: https://opentelemetry.io/docs/specs/otel/compatibility/prometheus_and_openmetrics/

## Issues Found
- The post used the deprecated `httpcheck` receiver component name. Updated the receiver examples and pipeline references to the current `http_check` component type while leaving the metric names as `httpcheck.*`.
- The basic Collector configuration referenced the `batch` processor in the metrics pipeline without defining it. Added a `processors` section with `batch`.
- The post described `httpcheck.status` as a gauge containing the HTTP status code. Updated the explanation to match the receiver documentation: the metric reports 1 when the status code matches the status class for that series, otherwise 0.
- The post stated that all metrics include `http.method` and `http.status_code`. Updated the text because those attributes are documented for `httpcheck.status`, while `httpcheck.duration` and `httpcheck.error` have different attribute sets.
- The PromQL unhealthy endpoint alert compared the status metric value directly with HTTP status code ranges. Updated it to alert on non-2xx `http_status_class` series with value 1 and to report the status code from the label.
- The error alert used `rate(httpcheck_error_total[5m])`, but `httpcheck.error` is documented as a non-monotonic sum and is not a counter that should be alerted on with `rate`. Updated the example to alert when `httpcheck_error > 0`.
- The advanced configuration comment mentioned timeout settings, but the snippet did not include any. Added per-target `timeout` values, which are supported through the receiver's HTTP client configuration options.

## Review Notes
The HTTP Check receiver is documented with alpha stability for metrics. The PromQL examples assume a backend/exporter that normalizes OpenTelemetry metric and attribute names into Prometheus-style underscores, as the original post already did.
