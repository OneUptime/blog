# Validation Summary: How to Ship Docker Container Logs to Loki

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Docker Engine logging drivers
- Docker Compose logging configuration
- Grafana Loki
- Loki Docker logging driver plugin
- Promtail
- Docker JSON file logging
- Grafana

## Sources Consulted
- Grafana Loki Docker driver documentation: https://grafana.com/docs/loki/latest/send-data/docker-driver/
- Grafana Loki Docker driver configuration reference: https://grafana.com/docs/loki/latest/send-data/docker-driver/configuration/
- Grafana Loki Promtail EOL notice: https://grafana.com/docs/loki/latest/send-data/promtail/
- Grafana Loki Promtail v2.9.4 configuration source: https://raw.githubusercontent.com/grafana/loki/v2.9.4/docs/sources/send-data/promtail/configuration.md
- Grafana Loki Promtail v2.9.4 docker stage source: https://raw.githubusercontent.com/grafana/loki/v2.9.4/docs/sources/send-data/promtail/stages/docker.md
- Grafana Loki Promtail v2.9.4 json stage source: https://raw.githubusercontent.com/grafana/loki/v2.9.4/docs/sources/send-data/promtail/stages/json.md
- Grafana Loki Promtail v2.9.4 multiline stage source: https://raw.githubusercontent.com/grafana/loki/v2.9.4/docs/sources/send-data/promtail/stages/multiline.md
- Docker JSON file logging driver documentation: https://docs.docker.com/engine/logging/drivers/json-file/
- Docker logging driver configuration documentation: https://docs.docker.com/engine/logging/configure/
- Docker log tag template documentation: https://docs.docker.com/engine/logging/log_tags/

## Issues Found
- The post described the Loki Docker driver as native. Changed this to the official Loki Docker logging driver plugin, matching Grafana's documentation.
- The Loki Docker driver installation command used `grafana/loki-docker-driver:2.9.4` without the current architecture-specific tag format. Updated the install and troubleshooting commands to `grafana/loki-docker-driver:3.7.0-amd64`, which matches the current official example. ARM64 users should use the corresponding `-arm64` tag.
- The Loki driver options table listed `loki-batch-size` as a number of log lines with default `102400`. Updated it to the documented maximum batch size with default `1048576`.
- The Loki driver options table listed `loki-max-backoff` default as `5s`. Updated it to the documented `5m`.
- The Loki driver options table listed no default for `loki-external-labels`. Updated it to the documented default `container_name={{.Name}}`.
- Promtail is now end of life as of March 2, 2026. Added a note that Promtail examples are for existing deployments and that new deployments should use Grafana Alloy or another supported Loki client. Also adjusted concluding bullets to describe those examples as legacy Promtail deployments.
- The introduction claimed the guide covered all approaches with production-ready configurations. Adjusted this to "common approaches with practical configurations" because Promtail-based configurations are no longer suitable as new production recommendations after Promtail EOL.

## Review Notes
The Promtail examples are syntactically consistent with Promtail v2.9-era configuration, including `json`, `docker`, and `multiline` pipeline concepts. However, Promtail is unsupported after March 2, 2026, so a future content update should replace the Promtail-based file collection and service discovery examples with Grafana Alloy equivalents.
