# Validation Summary: How to Configure OTel Arrow for Cross-Region Telemetry Transport to Minimize

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OTel Arrow exporter and receiver
- OTLP/gRPC
- Zstd compression
- OpenTelemetry Collector processors: memory_limiter, batch, resource, filter, tail_sampling
- TLS and mTLS certificate configuration
- Prometheus / PromQL

## Sources Consulted
- OpenTelemetry Collector Contrib otelarrowexporter documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/exporter/otelarrowexporter
- OpenTelemetry Collector Contrib otelarrowreceiver documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/otelarrowreceiver
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector transforming telemetry / filter processor documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector Contrib tail_sampling processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md
- OpenTelemetry OTel Arrow production guidance: https://opentelemetry.io/blog/2024/otel-arrow-production/
- OpenSSL command behavior checked against the local `openssl` CLI syntax expectations.
- Collector configuration snippets validated with `otel/opentelemetry-collector-contrib:0.153.0 validate`.

## Issues Found
- The opening cost example said 50,000 spans per second could produce only 2-5 GB per hour and $150-$400 per month, which conflicted with the later calculation of 270 GB/hour before compression and $960/month at $0.02/GB. I changed the introduction to describe tens to hundreds of GB per hour before compression and hundreds to thousands of dollars per month.
- The OTel Arrow savings claim was narrowed from 50-70% to 30-70% to match OpenTelemetry's published production guidance, while the later worked example remains an illustrative estimate.
- The filter processor example used `duration < 100ms`, which is not a documented span path in the current OTTL span context. I changed it to compare `end_time_unix_nano - start_time_unix_nano` against `100000000` nanoseconds.
- The exporter used `max_stream_lifetime: 30m` and described longer streams as inherently better for compression. Current otelarrow guidance recommends coordinating exporter stream lifetime with receiver/proxy keepalive settings so streams close cleanly. I changed the example to `9m` with receiver keepalive grace set to `600s`.
- The central gateway placed `arrow.memory_limit_mib` under `protocols.grpc`; the otelarrow receiver schema defines `protocols.arrow` as a sibling of `protocols.grpc`. I moved the setting to the correct location.
- The regional gateway exported logs over OTel Arrow, but the central gateway had no logs pipeline. I added a logs pipeline and generic OTLP logs exporter so all exported signals have a receiving pipeline.
- The OpenSSL commands would prompt for subject details. I added `-subj` values so the commands run non-interactively as shown.
- The PromQL examples used `otelcol_exporter_sent_bytes_total`, which is not the otelarrow network byte metric documented by the exporter. I changed the examples to use `otelcol_exporter_sent_wire_total`, the Prometheus form of the documented wire-byte metric.

## Review Notes
The main regional and central Collector YAML snippets were schema-validated with `otel/opentelemetry-collector-contrib:0.153.0 validate`. The compression ratios and cost savings remain workload-dependent estimates, so production deployments should measure `otelcol_exporter_sent_wire_total` directly and compare it with uncompressed or baseline OTLP transport for their own telemetry shape.
