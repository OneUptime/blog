# Validation Summary: How to Set Up Heartbeat and Dead Man's Switch Alerts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector internal telemetry
- Prometheus alerting rules and PromQL
- Prometheus Alertmanager routing
- Webhook-based dead man's switch monitoring

## Sources Consulted
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/3.0/querying/functions/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The Collector example used `service.telemetry.metrics.address`, but official OpenTelemetry documentation says this setting is ignored as of Collector v0.123.0. Updated the snippet to use `service.telemetry.metrics.readers` with a pull Prometheus exporter, `host`, and `port`.
- The updated Collector telemetry reader would otherwise expose Prometheus-specific suffixes for some internal metrics. Added `without_type_suffix: true` and `without_units: true` so the example's alert rules continue to match the documented `otelcol_*` metric names used in the post.
- The Alertmanager route used the deprecated `match` map syntax. Replaced it with the current `matchers` list syntax: `purpose="deadman"`.
- The per-service missing telemetry alert used a regex selector inside one `absent_over_time()` expression. That detects when all matching services are absent, not when one critical service disappears while others are still sending data. Replaced it with explicit `absent_over_time()` checks for each service joined with `or`, preserving the `service_name` label for alert annotations.

## Review Notes
- The Collector internal telemetry documentation warns that the declarative telemetry configuration schema is still under development and can change before a 1.0 schema release.
- The Prometheus and Alertmanager examples are valid patterns, but production deployments should validate rule and Alertmanager files with `promtool` and `amtool` in CI. Those CLIs were not installed in this workspace, so validation was performed against official documentation rather than local command output.
