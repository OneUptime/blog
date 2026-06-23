# Validation Summary: How to Rotate and Manage Docker Container Logs

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Docker logging drivers (json-file, syslog, fluentd, loki, journald)
- Docker Compose logging configuration
- rsyslog and logrotate
- Fluentd / Fluent Bit
- Grafana Loki + Loki Docker driver plugin
- cAdvisor / Prometheus
- Bash monitoring scripts

## Sources Consulted
- Docker logging driver overview — https://docs.docker.com/engine/logging/configure/
- json-file driver options (max-size, max-file, compress) — https://docs.docker.com/engine/logging/drivers/json-file/
- syslog driver options (syslog-address, syslog-facility, syslog-format rfc5424, tag) — https://docs.docker.com/engine/logging/drivers/syslog/
- fluentd driver options (fluentd-address, fluentd-async, tag) — https://docs.docker.com/engine/logging/drivers/fluentd/
- Grafana Loki Docker driver client (loki-url, loki-batch-size, loki-retries, loki-timeout, loki-external-labels) — https://grafana.com/docs/loki/latest/send-data/docker-driver/
- Log tag template markers (.Name, .ID, .ImageName) — https://docs.docker.com/engine/logging/log_tags/
- Docker daemon.json log-driver/log-opts — https://docs.docker.com/engine/daemon/
- Fluent Bit tail input and file output — https://docs.fluentbit.io/manual/pipeline/inputs/tail
- cAdvisor metrics reference — https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md

## Issues Found
- **cAdvisor log-size claim (Monitoring section):** The post stated "Use cAdvisor to export container log sizes" and "cAdvisor exports container metrics including log file sizes." This is inaccurate — cAdvisor exports container resource and storage-layer filesystem metrics, but does not expose per-container json-file log sizes (those files live under `/var/lib/docker/containers`, outside the writable layer cAdvisor measures). Reworded the heading and explanatory sentence to describe cAdvisor accurately and direct readers to the disk-usage scripts for log-specific alerting. No other content changed.

## Review Notes
- All logging-driver options verified against current Docker docs: json-file `max-size`/`max-file`/`compress`, syslog `syslog-format: rfc5424`, fluentd `fluentd-async` (the current non-deprecated option name), and the Loki driver options are all correct.
- Rotated json-file naming (`<id>-json.log`, `.1`, `.2`) and the YAML-anchor (`x-logging`) Compose extension field are accurate.
- `loki-batch-size: "400"` is small but valid and matches Grafana's own example; left as-is.
- `du -sh /var/lib/docker/containers/*/` measures the full per-container directory (which includes the json log), not the log file alone — an acceptable approximation as written, with the dedicated scripts later in the post handling precise per-log sizing.
- Truncation/emergency commands correctly carry warnings about writing-while-truncating corruption.
