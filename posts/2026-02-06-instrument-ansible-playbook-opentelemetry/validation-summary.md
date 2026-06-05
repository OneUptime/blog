# Validation Summary: How to Instrument Ansible Playbook Execution with OpenTelemetry

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible callback plugins
- OpenTelemetry Python SDK
- OTLP gRPC exporter
- OpenTelemetry Collector
- Distributed tracing

## Sources Consulted
- Ansible Core callback plugin documentation: https://docs.ansible.com/projects/ansible-core/2.18/plugins/callback.html
- Ansible callback base source for callback method signatures: https://github.com/ansible/ansible/blob/devel/lib/ansible/plugins/callback/__init__.py
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector OTLP receiver documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/receiver/otlpreceiver/README.md
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry Collector resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector OTLP exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md

## Issues Found
- The original plugin keyed task spans only by `task._uuid`, but Ansible runner result callbacks are host-specific. This meant the first host result would close the shared task span and later hosts would not be represented correctly. Updated the example to create host-specific task spans in `v2_runner_on_start` and key them by host name plus task UUID.
- Play spans were only ended in `v2_playbook_on_stats`, so earlier plays would appear to last until the end of the whole playbook. Updated the example to end the current play span when the next play starts, then close the final play at stats time.
- The post claimed role spans were created, but the provided code did not create true role-level spans. Updated the wording to describe role attributes/grouping instead of role spans, and adjusted the related section title and code comments.
- The plugin did not close skipped or unreachable task spans. Added handlers for `v2_runner_on_skipped` and `v2_runner_on_unreachable`.
- The sample OTLP endpoint environment variable omitted the URL scheme. Updated it to `http://collector.example.com:4317`, matching the OTLP exporter specification for scheme-aware endpoint configuration.
- Removed an unused `time` import and unused root context variable from the code sample.

## Review Notes
The Ansible callback sample still uses private Ansible object attributes such as `result._task`, `result._host`, and `playbook._file_name`, which is common in callback examples but may require maintenance across Ansible core releases. The Collector configuration is valid for the core OTLP receiver, batch processor, resource processor, and OTLP gRPC exporter, assuming the backend endpoint and TLS settings match the deployment.
