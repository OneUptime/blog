# Validation Summary: How to Get Webpage Values with Blackbox Exporter

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Prometheus
- Prometheus Blackbox Exporter
- PromQL
- Docker Compose
- Kubernetes Deployments and ConfigMaps
- HTTP, HTTPS, TLS, DNS, TCP, ICMP monitoring

## Sources Consulted
- Prometheus Blackbox Exporter README: https://github.com/prometheus/blackbox_exporter
- Prometheus Blackbox Exporter configuration reference: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Prometheus Blackbox Exporter example configuration: https://github.com/prometheus/blackbox_exporter/blob/master/example.yml
- Prometheus multi-target exporter guide: https://prometheus.io/docs/guides/multi-target-exporter/
- Prometheus Blackbox Exporter releases: https://github.com/prometheus/blackbox_exporter/releases
- Docker Compose file reference for the obsolete top-level version key: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The description and introduction incorrectly stated that Blackbox Exporter can extract and expose arbitrary webpage values as metrics. Updated this to say it validates values in responses and exposes probe result metrics, which matches the exporter behavior.
- The description referred to header extraction and JSON parsing, but the examples validate headers and response content. Updated the wording to header validation and JSON response checks.
- The SSL expiry example was labeled as days but returned seconds. Changed the PromQL expression to divide by 86400.
- The response timing section used the non-existent metric `probe_http_ssl_handshake_seconds`. Replaced it with `probe_http_duration_seconds{job="blackbox-http", phase="tls"}`.
- The Docker Compose example used the obsolete top-level `version` property. Removed it.
- The Kubernetes Deployment pinned `prom/blackbox-exporter:v0.24.0`, which is outdated. Updated it to `v0.28.0`, the latest release shown by the upstream releases page at review time.
- The alerting section was titled "Create Grafana Alerts" while showing Prometheus alerting rules. Renamed it to "Create Prometheus Alerts."

## Review Notes
The regex-based JSON examples are valid for simple checks, but they are not full JSON parsing. Blackbox Exporter v0.27.0 and later also supports JSON body checks with CEL expressions, which could be a useful future improvement if the post is expanded.
