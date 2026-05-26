# Validation Summary: How to Use Ansible to Deploy OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib distribution
- OTLP, Prometheus, Jaeger receiver, host metrics, debug exporter
- systemd
- YAML and Jinja2 templates

## Sources Consulted
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- OpenTelemetry Collector exporters documentation: https://opentelemetry.io/docs/collector/components/exporter/
- OpenTelemetry Collector troubleshooting documentation for the debug exporter: https://opentelemetry.io/docs/collector/troubleshooting/
- OpenTelemetry Collector releases repository and v0.153.0 release assets: https://github.com/open-telemetry/opentelemetry-collector-releases
- OpenTelemetry Collector logging exporter removal announcement: https://github.com/open-telemetry/opentelemetry-collector/issues/11337
- Ansible built-in module and filter documentation: https://docs.ansible.com/ansible/latest/collections/ansible/builtin/
- Local validation with `otelcol-contrib version 0.153.0`: `otelcol-contrib validate --config /tmp/otel-test-config-153.yml`

## Issues Found
- The post pinned OpenTelemetry Collector `0.91.0`, which is outdated for a 2026 tutorial. Updated the example to `0.153.0`, the latest official release found during review on 2026-05-26.
- The examples used the `logging` exporter and `loglevel` option. The logging exporter was removed from official distributions starting in Collector `0.111.0`; replaced it with the supported `debug` exporter and `verbosity: basic`.
- The Collector template used `service.telemetry.metrics.address`. Current OpenTelemetry documentation says this setting is ignored as of Collector `0.123.0`; replaced it with the current `readers.pull.exporter.prometheus.host` and `port` schema.
- The pipeline diagram showed a Jaeger exporter. Current official distributions include a Jaeger receiver but not a Jaeger exporter, so the diagram now shows the debug exporter instead.
- The summary implied direct Jaeger exporting. Updated it to describe sending OTLP traces to a Jaeger-compatible backend.

## Review Notes
The rendered Collector configuration was validated with the official `otelcol-contrib 0.153.0` binary. Ansible was not installed in the workspace, so Ansible syntax and module behavior were checked against official Ansible documentation rather than by running `ansible-playbook`.
