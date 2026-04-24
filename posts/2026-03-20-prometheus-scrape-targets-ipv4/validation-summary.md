# Validation Summary: How to Configure Prometheus Scrape Targets with IPv4 Addresses

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus
- Prometheus scrape configuration (`prometheus.yml`)
- Prometheus HTTP API
- File-based service discovery
- YAML
- JSON
- `curl`
- Python 3

## Sources Consulted
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTP API reference: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus file-based service discovery guide: https://prometheus.io/docs/guides/file-sd/
- Prometheus basic auth guide: https://prometheus.io/docs/guides/basic-auth/

## Issues Found
- The description said the post used relabeling to add metadata, but the examples actually use `static_configs.labels`. I corrected the description to match the configuration shown in the post and Prometheus’s `static_config` documentation.
- The file-based service discovery JSON example included a `// /etc/prometheus/targets/nodes.json` comment inside a `json` code block, which made the snippet invalid JSON. I moved the file path outside the JSON block so the example is syntactically correct.
- The verification example used `GET /api/v1/targets?state=unhealthy`, but the official Prometheus API only documents `state=active`, `state=dropped`, and `state=any` for that endpoint. I replaced it with a valid `scrapePool=node_exporter` example and updated the comment accordingly.

## Review Notes
- The scrape configuration examples are otherwise consistent with current Prometheus documentation for `static_configs`, `metrics_path`, `scheme`, `tls_config`, `basic_auth`, and `file_sd_configs`.
- The HTTPS example is valid, but in real deployments scraping an IP over TLS may also require the certificate to include that IP address as a SAN, or a `tls_config.server_name` override if the certificate is issued for a hostname.
