# Validation Summary: How to Run Prometheus in a Podman Container

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- Prometheus
- Prometheus Docker image
- Prometheus YAML configuration
- Prometheus alerting rules
- PromQL
- Prometheus HTTP API

## Sources Consulted
- Prometheus installation documentation: https://prometheus.io/docs/prometheus/latest/installation/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus command-line flags documentation: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus storage documentation: https://prometheus.io/docs/prometheus/latest/storage/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus PromQL basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Podman run documentation: https://docs.podman.io/en/stable/markdown/podman-run.1.html
- Podman kill documentation: https://docs.podman.io/en/stable/markdown/podman-kill.1.html

## Issues Found
- The reload command used `curl -X POST http://localhost:9090/-/reload`, but Prometheus only enables HTTP reloads when started with `--web.enable-lifecycle`. Changed the management example to send `SIGHUP` with `podman kill --signal SIGHUP my-prometheus`, which Prometheus supports for configuration reloads and Podman supports via the `--signal` option.
- The alerting example reused the `prometheus-data` volume while `prometheus-persistent` was still running. A second Prometheus process cannot safely use the same TSDB data directory at the same time because Prometheus locks its storage path. Added `podman stop prometheus-persistent` before starting `prometheus-alerts`.
- The persistent storage example used deprecated Prometheus flags `--storage.tsdb.retention.time` and `--storage.tsdb.retention.size`. Moved those settings into the `storage.tsdb.retention` section of `prometheus.yml`, retained `--storage.tsdb.path` as a startup flag, and changed the verification command to inspect the loaded configuration.
- The persistent storage example passed custom Prometheus command-line arguments after the image name, which overrides the image's default command arguments. Re-added the Prometheus image's console template and console library paths so those defaults are preserved.

## Review Notes
- Podman was not installed in the local review environment, so Podman command validation was performed against official Podman documentation rather than local `--help` output.
- The alerting rule syntax is valid, but the final alerting configuration only scrapes Prometheus itself. The `HighCpuUsage` alert depends on Node Exporter metrics and will only evaluate with data if a scrape job for Node Exporter is included.
- Prometheus alerting rules are configured, but no Alertmanager is configured in this post, so alerts can be viewed in Prometheus but will not be routed as external notifications.
