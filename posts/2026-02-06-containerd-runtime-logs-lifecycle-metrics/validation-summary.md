# Validation Summary: How to Collect containerd Runtime Logs and Container Lifecycle Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- containerd
- OpenTelemetry Collector
- Filelog receiver
- Journald receiver
- Prometheus receiver
- Prometheus metrics
- systemd journal

## Sources Consulted
- containerd Ops documentation: https://containerd.io/docs/main/ops/
- containerd metrics endpoint source: https://github.com/containerd/containerd/blob/main/plugins/server/metrics/plugin.go
- containerd getting started metrics example: https://github.com/containerd/containerd/blob/main/docs/getting-started.md
- containerd CRI metrics source: https://github.com/containerd/containerd/blob/main/internal/cri/server/metrics.go
- containerd CRI image metrics source: https://github.com/containerd/containerd/blob/main/internal/cri/server/images/metrics.go
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector journald receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/journaldreceiver/README.md
- OpenTelemetry Stanza timestamp parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Stanza filter operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/filter.md
- OpenTelemetry Stanza severity parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- systemd journalctl help output for `-u`, `--no-pager`, and `-n`
- systemd systemctl help output for `restart`

## Issues Found
- The filelog timestamp parser used `%L`, which is documented as milliseconds, while the example containerd timestamps include nanoseconds. Updated the timestamp layout to `%Y-%m-%dT%H:%M:%S.%sZ` in all filelog examples.
- The lifecycle-event `filter` operator expression matched lifecycle messages directly. The Stanza filter operator drops matching entries, so this would remove the events the post said it kept. Inverted the expression so non-lifecycle messages are dropped.
- The post said the lifecycle log parsing example could track how long operations take, but the example only filters lifecycle log events and does not compute durations. Changed the wording to say it tracks when operations occur.
- Several listed containerd metrics were not metrics defined by current containerd source, including `containerd_container_operations_duration_seconds_*`, `containerd_containers_total`, `containerd_images_total`, prefixed gRPC metrics, and `containerd_snapshot_ops_duration_seconds_bucket`. Replaced them with containerd CRI lifecycle, image pull, network plugin, gRPC, and process metrics supported by current containerd and Prometheus sources.
- The summary mentioned container counts based on the incorrect metric list. Updated it to mention image pulls and network plugin operations instead.

## Review Notes
- The `[metrics] address` configuration is still accepted through containerd compatibility mapping, and containerd documentation continues to show it. Newer containerd source maps it internally to the `io.containerd.server.v1.metrics` plugin configuration.
- The journald receiver is a contrib/k8s OpenTelemetry Collector component and requires `journalctl` plus sufficient permissions on the target host or container.
