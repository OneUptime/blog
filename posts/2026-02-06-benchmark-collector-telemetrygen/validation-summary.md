# Validation Summary: How to Benchmark the Collector with telemetrygen

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- telemetrygen
- OTLP/gRPC and OTLP/HTTP
- Collector internal telemetry metrics
- Kubernetes Jobs
- Bash
- YAML

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector exporter documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector Contrib telemetrygen README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/cmd/telemetrygen
- OpenTelemetry Collector Contrib telemetrygen source flag definitions: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/cmd/telemetrygen
- OpenTelemetry Collector debug exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md

## Issues Found
- The telemetrygen installation section listed Go 1.20 and `telemetrygen --version`. Current telemetrygen uses a newer Go module requirement and does not define a version flag in the current command setup, so the requirement text was updated to Go 1.25 or later and the version command was removed.
- The Collector config used the deprecated `logging` exporter and described the debug exporter as dropping data and reporting stats. The deprecated exporter block was removed, and the debug exporter description was corrected.
- The Collector internal metrics config used `service.telemetry.metrics.address`, which is ignored as of Collector v0.123.0. It was replaced with a Prometheus pull reader using `host` and `port`.
- The test Collector config omitted a logs pipeline even though the post later benchmarks logs. A logs pipeline was added.
- Several telemetrygen trace flags were outdated or invalid: `--spans`, `--span-kind`, `--service-name`, `--trace-attributes`, and `--span-attributes`. They were replaced with current flags: `--child-spans`, `--service`, `--otlp-attributes`, and `--telemetry-attributes`.
- The post described `--rate` as a global per-second rate. Current telemetrygen applies `--rate` per worker, so the explanation and high-volume example were corrected.
- The OTLP/HTTP endpoint example included an `http://` scheme, but telemetrygen's current OTLP HTTP endpoint flag expects the endpoint host and port. It was changed to `localhost:4318`.
- The metrics example used `--metric-type Counter`, which is not a current telemetrygen metric type. It was changed to `--metric-type Sum`.
- The metrics stress test used `--metrics` together with `--duration`, but telemetrygen ignores `--metrics` when duration is provided. The ignored flag was removed/replaced.
- Authentication and TLS examples used outdated flag names: `--otlp-headers`, `--otlp-certificate`, `--otlp-client-certificate`, and `--otlp-client-key`. They were replaced with `--otlp-header`, `--ca-cert`, `--mtls`, `--client-cert`, and `--client-key`.

## Review Notes
The post is now technically aligned with current telemetrygen source and current Collector internal telemetry configuration. The examples still use illustrative load rates; real benchmark rates should be calibrated to the generator host capacity and backend environment.
