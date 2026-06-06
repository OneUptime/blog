# Validation Summary: How to Collect Host CPU, Memory, and Disk Metrics with the Collector

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib
- Host Metrics receiver
- Resource Detection processor
- Batch processor
- OTLP exporter
- Docker Compose
- Linux host metrics

## Sources Consulted
- OpenTelemetry Collector Contrib Host Metrics receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Contrib CPU scraper metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/internal/scraper/cpuscraper/metadata.yaml
- OpenTelemetry Collector Contrib memory scraper metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/internal/scraper/memoryscraper/metadata.yaml
- OpenTelemetry Collector Contrib disk scraper metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/internal/scraper/diskscraper/metadata.yaml
- OpenTelemetry Collector Contrib Resource Detection processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/resourcedetectionprocessor/README.md
- OpenTelemetry Collector Releases core distribution manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/main/distributions/otelcol/manifest.yaml
- OpenTelemetry Collector Releases v0.96.0 core distribution manifest: https://github.com/open-telemetry/opentelemetry-collector-releases/blob/v0.96.0/distributions/otelcol/manifest.yaml
- OpenTelemetry Collector Releases latest release listing: https://github.com/open-telemetry/opentelemetry-collector-releases/releases

## Issues Found
- The post stated that the `hostmetrics` receiver is only part of the Collector Contrib distribution and that core users must switch to Contrib. Updated this to say the receiver is included in core, contrib, and Kubernetes distributions. Kept the Contrib install path because the post later uses `resource_detection`, which is not in the core distribution.
- The install and Docker examples used `v0.96.0` while describing the package as latest. Updated the examples to `v0.153.0`, the current OpenTelemetry Collector release available during review.
- The post described CPU metrics as both per-core and aggregate, and suggested disabling per-core reporting. The official CPU scraper metadata reports `system.cpu.time` and `system.cpu.utilization` by logical CPU and state. Updated the wording to per-logical-CPU metrics and removed the unsupported per-core/aggregate toggle claim.
- The filtering section implied that the hostmetrics receiver can filter CPU cores. Updated this to describe disk device filtering and metric enablement, which match the receiver configuration schema.
- The resource detection example used `resourcedetection`, which is now a deprecated alias. Updated the processor type and pipeline reference to `resource_detection`.
- The container guidance said the receiver must run on the host and included environment variables that are not part of the official hostmetrics `root_path` guidance. Updated the guidance to agent deployment plus host filesystem mount with `root_path`.
- Replaced metric “labels” wording with OpenTelemetry “attributes” where the post described emitted metric dimensions.
- Removed a specific unsupported resource usage estimate for the Collector process and replaced it with dependency-aware guidance.

## Review Notes
The post is now technically accurate for the current Collector documentation. The metric tables list common CPU, memory, and disk metrics, but some optional metrics such as CPU frequency/count, Linux-specific memory metrics, and additional disk counters remain outside the scope of the article.
