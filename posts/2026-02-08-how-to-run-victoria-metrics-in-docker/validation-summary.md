# Validation Summary: How to Run Victoria Metrics in Docker

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VictoriaMetrics single-node
- Docker and Docker Compose
- Prometheus remote write and scrape configuration
- Grafana data source provisioning
- vmagent
- vmalert and Alertmanager
- vmbackup and vmrestore
- PromQL and MetricsQL

## Sources Consulted
- VictoriaMetrics single-node documentation: https://docs.victoriametrics.com/victoriametrics/single-server-victoriametrics/
- VictoriaMetrics command-line flags: https://docs.victoriametrics.com/victoriametrics/
- VictoriaMetrics vmagent documentation: https://docs.victoriametrics.com/vmagent/
- VictoriaMetrics vmalert documentation: https://docs.victoriametrics.com/victoriametrics/vmalert/
- VictoriaMetrics vmbackup documentation: https://docs.victoriametrics.com/vmbackup/
- VictoriaMetrics vmrestore documentation: https://docs.victoriametrics.com/vmrestore/
- Prometheus configuration and remote write documentation: https://prometheus.io/docs/operating/configuration/ and https://prometheus.io/docs/practices/remote_write/
- Grafana provisioning and Prometheus data source documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/ and https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/

## Issues Found
- The storage-efficiency claim said VictoriaMetrics typically uses 7-10x less disk than Prometheus. Current VictoriaMetrics documentation states up to 7x less storage space compared to Prometheus, Thanos, or Cortex, so the claim was changed to "up to 7x less disk space."
- The quick-start verification command labeled `/api/v1/status/tsdb` as an active time series count. VictoriaMetrics documents `/api/v1/series/count` as the total time series count endpoint, so the command and label were corrected.
- The JSON line import example used a seconds timestamp. VictoriaMetrics JSON line import expects timestamps in milliseconds, so the example timestamp was changed from `1705312200` to `1705312200000`.
- Several `curl` query examples embedded PromQL ranges such as `[5m]` and `match[]` directly in URLs, which can be interpreted by curl URL globbing. These were changed to `curl -G --data-urlencode` examples.
- The `vmbackup` Docker example used `http://victoriametrics:8428` from a standalone `docker run` container, where that Docker DNS name would not resolve by default. The example now joins the running VictoriaMetrics container network namespace and uses `http://localhost:8428`.
- The production tuning example included `-bigMergeConcurrency` and `-smallMergeConcurrency`; current VictoriaMetrics flag docs mark `-bigMergeConcurrency` as deprecated/no-op, so the merge concurrency flags were removed. The `-search.maxUniqueTimeseries` comment was corrected to describe the flag accurately.

## Review Notes
The Prometheus, Grafana, vmagent, vmalert, backup, restore, retention, remote write, ingestion, and query endpoints were otherwise consistent with current official documentation. The example scrape configs reference `node-exporter` and `cadvisor` targets that are not defined in the shown Compose files; this is valid Prometheus/vmagent configuration syntax, but users must run those exporters separately or add them to the Compose stack for those targets and CPU alert examples to produce data.
