# Validation Summary: How to Monitor Docker Engine Metrics with the Docker Stats Receiver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- Docker Stats receiver (`docker_stats`)
- Docker Engine / Docker daemon socket
- OpenTelemetry Collector YAML configuration
- Prometheus-style alert expressions

## Sources Consulted
- OpenTelemetry Collector Contrib Docker Stats receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/dockerstatsreceiver
- OpenTelemetry Collector Contrib Docker Stats receiver generated metric documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/dockerstatsreceiver/documentation.md
- OpenTelemetry Collector Contrib Docker Stats receiver package documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/receiver/dockerstatsreceiver
- OpenTelemetry Collector debug exporter documentation: https://pkg.go.dev/go.opentelemetry.io/collector/exporter/debugexporter
- Docker CLI `docker stats` documentation: https://docs.docker.com/reference/cli/docker/container/stats/

## Issues Found
- The post used `container.cpu.percent`, which was removed from the Docker Stats receiver in favor of `container.cpu.utilization`. Updated the Collector config, metrics explanation, and Prometheus-style alert expression.
- The post used the deprecated/removed `logging` exporter with `loglevel: debug`. Updated it to the current `debug` exporter with `verbosity: detailed`.
- The resource processor example included `from_attribute: ""` while setting a static `value`. Removed the empty `from_attribute` field so the processor configuration is valid.
- The post described `container_labels_to_metric_labels` as filtering containers and as mapping labels to resource attributes. Updated the wording to state that it copies Docker labels to metric datapoint attributes.
- The Docker run command mounted the Docker socket but did not account for official Collector images running as a non-root user. Added `--group-add` using the host Docker group ID and documented the permission implication.
- The post stated that the Docker socket mount was read-only and implied that fully addressed safety. Added a caveat that Docker socket access still grants broad Docker API permissions to the Collector process.
- The memory usage metric description omitted that `container.memory.usage.total` excludes cache. Updated the description to match the generated receiver documentation.
- The exclusion section implied label-based exclusion. Updated it to use `excluded_images` for image-name exclusion and label mapping for backend filtering.
- The summary said the approach works for any Docker host, but the receiver documentation marks Darwin and Windows unsupported. Narrowed the claim to Linux Docker hosts.

## Review Notes
- The Docker Stats receiver is documented as alpha for metrics, so production deployments should pin and test a specific Collector Contrib version instead of relying on `latest`.
- `container.cpu.utilization` and `container.memory.percent` are unit `1` gauges in the generated documentation, but the receiver currently calculates them as 0-100 percentage values.
