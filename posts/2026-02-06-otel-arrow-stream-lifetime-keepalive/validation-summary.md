# Validation Summary: How to Tune OTel Arrow Stream Lifetime and Keepalive Settings for Optimal

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Protocol with Apache Arrow / OTel Arrow
- OTel Arrow exporter and receiver
- gRPC keepalive and connection management
- Prometheus / PromQL
- L4 and L7 load balancing

## Sources Consulted
- OpenTelemetry Collector Contrib `otelarrowexporter` README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/otelarrowexporter
- OpenTelemetry Collector Contrib `otelarrowreceiver` README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/otelarrowreceiver
- OpenTelemetry Collector gRPC configuration README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/configgrpc/README.md
- gRPC keepalive guide: https://grpc.io/docs/guides/keepalive/
- OpenTelemetry Protocol with Apache Arrow project README: https://github.com/open-telemetry/otel-arrow

## Issues Found
- The post recommended `max_stream_lifetime: 10m` and described 5-15 minutes as the general sweet spot. Current `otelarrowexporter` documentation lists a 30-second default and says compression benefit is reached quickly, so the post now recommends starting with 30 seconds and increasing only after measuring compression, retry behavior, and load distribution.
- The keepalive examples used 30-second client and server keepalive pings. The gRPC keepalive guide warns against setting client keepalive much below one minute, so the examples now use 60 seconds and match the receiver enforcement policy.
- The receiver example used `max_connection_age: 600s` with `max_connection_age_grace: 30s` while the exporter stream lifetime was 10 minutes. Current OTel Arrow docs expect `max_stream_lifetime` to be shorter than the receiver or proxy grace window minus the export timeout. The examples now use a 30-second stream lifetime with a 1-minute grace window.
- The post said `max_connection_age` should be at least 2x `max_stream_lifetime`. This is not the guidance in the current OTel Arrow docs. It now explains the relationship between stream lifetime, connection age, and connection-age grace.
- The L4 load balancing section implied stream recycling alone redistributes traffic through a TCP-level load balancer. Since an L4 load balancer pins established connections to a backend, the text now explains that connection recycling or exporter-side gRPC balancing is needed for redistribution.
- The PromQL examples referenced metrics that are not documented for the current component (`otelcol_exporter_otelarrow_stream_lifetime_seconds_bucket`, `otelcol_exporter_otelarrow_stream_reconnections_total`, and `otelcol_exporter_otelarrow_compression_ratio`). The section now uses documented exporter byte counters (`otelcol_exporter_sent`, `otelcol_exporter_sent_wire`) and receiver admission metrics (`otelcol_otelarrow_admission_in_flight_bytes`, `otelcol_otelarrow_admission_waiting_bytes`).

## Review Notes
- The OTel Arrow exporter and receiver are beta components in the OpenTelemetry Collector Contrib and Kubernetes distributions. Configuration defaults and telemetry instruments may still change across Collector releases, so production tuning should be verified against the exact Collector version in use.
