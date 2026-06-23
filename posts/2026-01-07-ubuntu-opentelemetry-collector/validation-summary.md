# Validation Summary: How to Install and Configure the OpenTelemetry Collector on Ubuntu

## Status
validated

## Post Type
Tutorial / installation and configuration guide

## Technologies Covered
- Ubuntu
- Linux systemd
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib distribution
- OpenTelemetry Collector receivers, processors, exporters, extensions, and service pipelines
- YAML configuration
- Prometheus metrics and remote write
- OTLP over gRPC and HTTP

## Sources Consulted
- OpenTelemetry Collector Linux installation documentation: https://opentelemetry.io/docs/collector/install/binary/linux/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector health check extension documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/extension/healthcheckextension/README.md
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector memory limiter processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector load balancing exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md
- OpenTelemetry Collector releases API and v0.154.0 release assets: https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.154.0
- Local validation with `otelcol-contrib version 0.154.0`, including `otelcol-contrib validate` and inspection of the official DEB package contents.

## Issues Found
- The installation section used a non-working `apt.opentelemetry.io` repository. I replaced it with the official release DEB download flow and noted what the Contrib DEB package installs.
- The examples pinned `OTEL_VERSION="0.96.0"`, which is outdated. I updated the examples to `0.154.0`, the latest release verified during review.
- The post described the Contrib DEB package as if it installed `/etc/otelcol/config.yaml` and a generic `otelcol` service. I added a note that the DEB package installs `otelcol-contrib`, `/etc/otelcol-contrib/config.yaml`, the `otelcol-contrib` system user, and `otelcol-contrib.service`.
- The Collector internal metrics examples used `service.telemetry.metrics.address`, which is ignored/invalid in current Collector versions. I replaced it with the current `readers` / pull Prometheus exporter syntax.
- The configuration validation section included `otelcol --config=... --dry-run`, but current `otelcol-contrib` exposes `validate` and not a `--dry-run` flag. I removed the unsupported command.
- The health check example set `response_body` to a string and used `check_collector_pipeline`, which is not recommended and does not work as expected in current docs. I changed `response_body` to the documented `healthy` / `unhealthy` map and removed `check_collector_pipeline`.
- The filter processor metric example used metric-level context with datapoint attributes. I changed it to `metrics.datapoint` and referenced `metric.name`, which validates with current OTTL context rules.
- The mTLS receiver example used unsupported `require_client_cert`. I removed that field and kept `client_ca_file`, which is the documented receiver-side mTLS setting.
- The load balancing exporter DNS resolver used a numeric `port`. I changed it to the documented string form.

## Review Notes
Representative Collector configurations were validated with the current `otelcol-contrib 0.154.0` binary. Some examples remain illustrative and use placeholder hosts, certificates, and tokens that must be replaced in a real deployment.
