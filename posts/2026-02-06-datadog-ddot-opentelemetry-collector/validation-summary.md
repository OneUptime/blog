# Validation Summary: How to Use Datadog Distribution (DDOT) of OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Datadog Distribution of OpenTelemetry Collector (DDOT)
- Datadog Agent OTLP ingest
- OpenTelemetry Collector configuration
- Datadog exporter and Datadog connector
- Datadog Helm chart and Datadog Operator
- Kubernetes
- Linux installation
- Host metrics receiver

## Sources Consulted
- Datadog DDOT Collector overview: https://docs.datadoghq.com/opentelemetry/setup/ddot_collector/
- Datadog Agent OpenTelemetry setup: https://docs.datadoghq.com/opentelemetry/setup/agent/
- Datadog DDOT Kubernetes DaemonSet install docs: https://docs.datadoghq.com/opentelemetry/setup/ddot_collector/install/kubernetes_daemonset/
- Datadog DDOT Linux install docs: https://docs.datadoghq.com/opentelemetry/setup/ddot_collector/install/linux/
- Datadog standalone OpenTelemetry Collector setup with Datadog exporter and connector: https://docs.datadoghq.com/opentelemetry/setup/collector_exporter/install/
- Datadog and OpenTelemetry compatibility table: https://docs.datadoghq.com/opentelemetry/compatibility/
- OpenTelemetry Collector configuration docs: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector host metrics receiver docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md

## Issues Found
- The post described DDOT as a standalone Collector that sends data to Datadog without running the Datadog Agent. Current Datadog documentation describes DDOT as embedded in or installed with the Datadog Agent. Updated the overview and option descriptions to reflect the current Agent-with-Collector model.
- The Docker example used `datadog/opentelemetry-collector-contrib:latest`, which is not the documented DDOT image path and was not accessible via Docker manifest inspection. Replaced the Docker section with Datadog's documented Linux install command using `DD_OTELCOLLECTOR_ENABLED=true`.
- The Helm example used a non-documented `datadog/opentelemetry-collector` chart. Replaced it with the documented `datadog/datadog` chart and `datadog.otelCollector.*` settings.
- The binary download URL referenced a standalone `ddot-collector-linux-amd64` release artifact that is not the documented DDOT install path. Replaced the section with the documented custom Collector configuration flow through the Datadog Helm chart.
- Collector environment variable references used `${DD_API_KEY}` and `${DD_SITE}`. Updated them to the current OpenTelemetry Collector syntax, `${env:DD_API_KEY}` and `${env:DD_SITE}`.
- The Kubernetes example used a raw DaemonSet and the incorrect standalone image. Replaced it with Datadog's documented Datadog Operator pattern using a `DatadogAgent` resource and a ConfigMap named with `otel-config.yaml`.
- The comparison table stated that Live Processes and network monitoring are not included with DDOT. Current Datadog docs list those as Agent-based features available with DDOT, so the table was corrected.
- The host metrics snippet referenced `batch` without defining it and included `docker_stats`, which is not listed in the default DDOT receiver set. Added the `batch` processor and removed `docker_stats` from the example.

## Review Notes
- All YAML blocks in the post parse successfully with PyYAML.
- The basic and host metrics Collector snippets were smoke-tested with the current `gcr.io/datadoghq/ddot-collector:latest` image and `/opt/datadog-agent/embedded/bin/otel-agent run` using dummy Datadog environment variables. The processes reached startup and timed out without snippet-level component/schema errors.
- Helm was not installed in the local workspace, so Helm commands were verified against Datadog's official chart documentation rather than local `helm` execution.
