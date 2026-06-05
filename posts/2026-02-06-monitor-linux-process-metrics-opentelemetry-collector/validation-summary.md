# Validation Summary: How to Monitor Linux Process Metrics with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib hostmetrics receiver
- hostmetrics process scraper
- Linux `/proc`
- Linux capabilities and systemd service capabilities
- Docker Compose
- OTLP exporter

## Sources Consulted
- OpenTelemetry Collector Contrib hostmetrics receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Contrib process scraper generated metric documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/internal/scraper/processscraper/documentation.md
- OpenTelemetry Collector Contrib resource detection processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector Contrib resource detection generated component metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/internal/metadata/generated_status.go
- OpenTelemetry Collector Contrib resource processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourceprocessor/README.md
- OpenTelemetry Collector Contrib attributes processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/attributesprocessor/README.md
- OpenTelemetry Collector Contrib releases: https://github.com/open-telemetry/opentelemetry-collector-contrib/releases

## Issues Found
- The post used outdated or incorrect process memory metric names, `process.memory.physical_usage` and `process.memory.virtual_usage`. Updated them to the current process scraper metrics, `process.memory.usage` and `process.memory.virtual`, throughout the prose, Mermaid diagram, alerting guidance, and YAML examples.
- The post said the process scraper can filter by process name, executable path, or command line. The official hostmetrics receiver configuration documents built-in process include/exclude filters by `names` only. Updated the wording to describe name-based filtering and clarified that executable path should be used in backend queries after collection.
- The post used `resourcedetection`, which is now a deprecated alias for `resource_detection`. Updated the processor name and service pipeline reference to `resource_detection`.
- The enrichment example used the `attributes` processor while describing resource attributes. Replaced it with the `resource` processor and its `attributes` actions so `environment` and `team` are added as resource attributes.
- The Docker Compose example pinned `otel/opentelemetry-collector-contrib:0.96.0`, which is old relative to the current Collector Contrib release. Updated it to `0.153.0`, the current release verified during review.
- The container example set `HOST_PROC`, but the documented hostmetrics mechanism is `root_path`. Removed the unused environment variable from the snippet.
- The mute flag example comment said it muted metrics for irrelevant processes. Updated the comment to say it mutes expected process-attribute read errors.

## Review Notes
- The hostmetrics process scraper metrics are currently documented with development stability, even though the hostmetrics receiver metrics signal is beta. Future Collector releases may still change process metric names or defaults.
- The Linux capability guidance is plausible for reading restricted `/proc` process data, but exact behavior can still vary with kernel, distribution hardening, container runtime, and service manager configuration.
