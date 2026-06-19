# Validation Summary: How to Set Up OpenTelemetry Collector for Traces

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OTLP gRPC and OTLP HTTP
- Jaeger
- Zipkin
- Docker and Docker Compose
- systemd
- Node.js OpenTelemetry SDK
- Python OpenTelemetry SDK
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector Docker installation documentation: https://opentelemetry.io/docs/collector/install/docker/
- OpenTelemetry Collector Jaeger exporter migration guidance: https://opentelemetry.io/blog/2023/jaeger-exporter-collector-migration/
- OpenTelemetry Collector Jaeger receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/jaegerreceiver/README.md
- OpenTelemetry Collector Zipkin receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/zipkinreceiver/README.md
- OpenTelemetry Collector zPages extension documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/extension/zpagesextension/README.md
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry JavaScript instrumentation documentation: https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry JavaScript SDK 2.x migration guide: https://github.com/open-telemetry/opentelemetry-js/blob/main/doc/upgrade-to-2.x.md
- OpenTelemetry Python getting started documentation: https://opentelemetry.io/docs/languages/python/getting-started/
- Jaeger getting started documentation: https://www.jaegertracing.io/docs/1.76/getting-started/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/en/telemetry/open-telemetry

## Issues Found
- The Docker run command used inline comments after line-continuation backslashes, which makes the shell command invalid. Removed the inline comments and kept the command executable.
- The Docker examples exposed only OTLP and zPages ports even though the configuration also enabled Zipkin, Jaeger legacy receivers, health_check, and pprof. Added the missing port mappings.
- The examples used floating `latest` image tags and an outdated `v0.90.0` binary download. Updated the Collector examples to `0.154.0` and Jaeger all-in-one to `1.76.0`.
- The Compose file included the obsolete `version: '3.8'` field. Removed it to match current Compose behavior.
- The Collector configuration used the removed native Jaeger exporter. Replaced it with an `otlp/jaeger` exporter targeting Jaeger's OTLP gRPC endpoint.
- The OneUptime exporter used a non-current OTLP gRPC endpoint. Updated it to the documented `otlphttp` exporter configuration with `https://oneuptime.com/otlp`, JSON encoding, and the required headers.
- The batch processor comment incorrectly described `send_batch_max_size` as bytes. Corrected it to describe the maximum outgoing item count.
- The memory limiter comments incorrectly described `spike_limit_mib` as the soft limit. Corrected the explanation to state that the soft limit is `limit_mib - spike_limit_mib`.
- The Node.js example used outdated resource APIs and deprecated semantic resource constants. Updated it to `resourceFromAttributes`, current service constants, and `deployment.environment.name`.
- The Python example used a direct `Resource(...)` constructor and deprecated deployment environment attribute. Updated it to `Resource.create(...)` and `deployment.environment.name`.

## Review Notes
- Verified the edited JavaScript snippet with `node --check`.
- Verified the edited Python snippet with `python3 -m py_compile`.
- Parsed both YAML snippets with PyYAML.
- Extracted the Collector configuration and validated it with `docker run --rm otel/opentelemetry-collector:0.154.0 validate --config=/etc/otel-collector-config.yaml`.
