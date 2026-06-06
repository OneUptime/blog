# Validation Summary: How to Configure the Host Metrics Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Host Metrics Receiver
- Host metrics scrapers for CPU, memory, disk, filesystem, network, load, paging, and processes
- OpenTelemetry Collector processors: batch, resource, resource detection, filter, attributes, and memory limiter
- OpenTelemetry Collector exporters: debug and OTLP
- Linux and Windows host metrics collection

## Sources Consulted
- OpenTelemetry Collector Contrib Host Metrics Receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- Host Metrics Receiver scraper metric documentation in the official contrib repository: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/hostmetricsreceiver/internal/scraper
- OpenTelemetry Collector Debug Exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/debugexporter/README.md
- OpenTelemetry Collector OTLP Exporter documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md
- OpenTelemetry Collector Contrib Filter Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector Contrib Resource Detection Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector Memory Limiter Processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/memorylimiterprocessor/README.md
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/

## Issues Found
- The post used the deprecated `hostmetrics` receiver type. Updated examples to `host_metrics`, the current documented component type.
- The basic example used the old `logging` exporter and `loglevel`. Updated it to the current `debug` exporter with `verbosity`.
- The post used the deprecated `resourcedetection` processor name. Updated examples to `resource_detection`.
- The CPU examples used invalid `report_per_cpu` configuration. Replaced it with supported metric `attributes` and `aggregation_strategy` settings.
- The filter processor example used an older `metrics.exclude.metric_names` configuration shape. Updated it to current OTTL `metric_conditions`.
- The Windows section incorrectly stated that load metrics are unavailable and included the unsupported `processes` scraper. Updated the load explanation and removed `processes` from the Windows example.
- The complete example used the ignored `service.telemetry.metrics.address` setting. Updated it to the current Prometheus reader configuration.
- The resource processor example implied `host.name` would be added by copying itself, but the host metrics receiver does not set resource attributes by default. Removed that ineffective action and kept the static environment attribute.
- The Linux permission troubleshooting example used unrelated capabilities. Replaced it with general guidance about readable host paths, container mounts, and `root_path`.
- Several metric descriptions were imprecise, especially utilization units, Linux available memory, disk I/O time, and load average. Updated them to match official scraper metric documentation.

## Review Notes
All YAML snippets were parsed successfully after edits. The current host metrics receiver includes additional scrapers such as `nfs`, `process`, and `system`; the post now describes its larger example as common scrapers rather than all available scrapers.
