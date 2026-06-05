# Validation Summary: How to Use Splunk Distribution of OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Splunk Distribution of OpenTelemetry Collector
- Splunk Observability Cloud
- Splunk APM
- Splunk Enterprise / Splunk Cloud HEC
- OpenTelemetry Collector YAML configuration
- Docker
- Kubernetes Helm
- Smart Agent receiver

## Sources Consulted
- Splunk OpenTelemetry Collector README: https://github.com/signalfx/splunk-otel-collector
- Splunk OpenTelemetry Collector default agent config: https://github.com/signalfx/splunk-otel-collector/blob/main/cmd/otelcol/config/collector/agent_config.yaml
- Splunk OpenTelemetry Collector default gateway config: https://github.com/signalfx/splunk-otel-collector/blob/main/cmd/otelcol/config/collector/gateway_config.yaml
- Splunk OpenTelemetry Collector components list: https://github.com/signalfx/splunk-otel-collector/blob/main/docs/components.md
- Splunk Linux installer documentation: https://help.splunk.com/en?resourceId=gdi_opentelemetry_collector-linux_install-linux
- Current Linux installer script help/options: https://dl.observability.splunkcloud.com/splunk-otel-collector.sh
- Splunk OpenTelemetry Collector Helm chart README and values: https://github.com/signalfx/splunk-otel-collector-chart
- Splunk deployment modes documentation: https://help.splunk.com/en?resourceId=gdi_opentelemetry_deployment-modes
- OpenTelemetry Collector contrib SignalFx exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/signalfxexporter
- OpenTelemetry Collector contrib Splunk HEC exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/exporter/splunkhecexporter

## Issues Found
- The Linux installer command used the legacy `dl.signalfx.com` URL, a non-existent `--access-token` flag, and a removed `--with-fluentd` flag. Updated it to the current `dl.observability.splunkcloud.com` URL and positional access token syntax after `--`.
- The post said the installer sets up Fluentd and auto-instrumentation by default. Updated the wording to say the installer sets up the collector and systemd services, with flags available for discovery and zero-code instrumentation.
- Several trace examples used the deprecated `sapm` exporter and legacy `signalfx.com` trace endpoint. Replaced them with the current `otlp_http` exporter and `observability.splunkcloud.com` OTLP trace endpoint.
- The agent and gateway examples used component names or receivers that no longer match current Splunk distribution examples, including `hostmetrics`, `sapm`, and `signalfx` receivers. Updated `hostmetrics` to `host_metrics` and simplified gateway/agent ingestion to OTLP.
- The HEC exporter examples used a realm-derived Splunk Cloud endpoint that is not generally valid for Splunk Enterprise/Cloud HEC. Replaced it with `${SPLUNK_HEC_URL}`.
- The Helm example used `splunkObservability.logsEnabled`, which is not a current chart value. Removed the invalid flag.
- The feature table listed bundled Fluentd integration and SAPM exporter support. Updated it to file log / Fluent Forward receiver support and OTLP HTTP exporter usage for Splunk APM.

## Review Notes
Smart Agent receiver support exists for migration, but current Splunk documentation encourages native OpenTelemetry receivers for active integrations where possible. The examples are still intentionally generic and require valid Splunk access tokens, HEC tokens, and environment variables for a real deployment.
