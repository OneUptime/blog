# Validation Summary: How to Collect File System Statistics with the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector hostmetrics receiver
- OpenTelemetry filesystem and disk scrapers
- OTLP exporter configuration
- Kubernetes DaemonSet host filesystem mounts
- File system, inode, and disk I/O metrics

## Sources Consulted
- OpenTelemetry Collector Contrib hostmetrics receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/README.md
- OpenTelemetry Collector Contrib filesystem scraper metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/internal/scraper/filesystemscraper/metadata.yaml
- OpenTelemetry Collector Contrib disk scraper metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/hostmetricsreceiver/internal/scraper/diskscraper/metadata.yaml
- OpenTelemetry semantic conventions for system metrics: https://opentelemetry.io/docs/specs/semconv/system/system-metrics/
- OpenTelemetry Kubernetes Collector components documentation: https://opentelemetry.io/docs/platforms/kubernetes/collector/components/

## Issues Found
- The post stated that the host metrics receiver is part of the Collector Contrib distribution. Current upstream documentation lists it in the core, contrib, and k8s distributions. Updated the wording to avoid implying it is contrib-only.
- The Kubernetes `root_path: /hostfs` example used `/hostfs`-prefixed values in `include_mount_points`. The filesystem scraper documentation says mount point filters must use the host's mount paths when `root_path` is set. Changed the filters to `/` and `/var/.*`.
- The `root_path` explanation implied mount points should be interpreted relative to `/hostfs`. Reworded it to state that `root_path` identifies where the host root is mounted inside the container, while mount point filters still use host paths.

## Review Notes
- The referenced hostmetrics scraper names, filesystem filter option names, disk filter option names, and metric names are consistent with current OpenTelemetry Collector documentation and scraper metadata.
- `system.filesystem.utilization` exists but is disabled by default in the filesystem scraper metadata. The post calculates usage from `system.filesystem.usage`, which is still valid.
- The alerting rules are backend-style pseudocode rather than a complete Collector configuration, which is appropriate for the surrounding text.
