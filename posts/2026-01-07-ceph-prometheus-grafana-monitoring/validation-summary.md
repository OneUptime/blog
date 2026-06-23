# Validation Summary: How to Monitor Ceph Cluster Health with Prometheus and Grafana

## Status
validated

## Post Type
Technical tutorial / monitoring guide

## Technologies Covered
- Ceph
- Ceph Manager Prometheus module
- Ceph Exporter
- Prometheus
- PromQL
- Alertmanager
- Grafana
- Bash
- systemd timers

## Sources Consulted
- Ceph Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph monitoring overview: https://docs.ceph.com/en/latest/monitoring/
- Ceph `cephadm logs` documentation: https://docs.ceph.com/en/latest/man/8/cephadm/
- Ceph official monitoring mixin dashboards and alerts: https://github.com/ceph/ceph/tree/main/monitoring/ceph-mixin
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus federation documentation: https://prometheus.io/docs/prometheus/latest/federation/
- Prometheus query operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Grafana provisioning documentation: https://grafana.com/docs/grafana/latest/administration/provisioning/
- Grafana Prometheus data source documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/
- Grafana Dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/
- systemd timer documentation: https://www.freedesktop.org/software/systemd/man/systemd.timer.html

## Issues Found
- The Prometheus `metric_relabel_configs` example used `action: keep` for only two latency metrics, which would drop nearly all Ceph metrics and break the later dashboards and alerts. Changed it to a commented optional drop example with a warning to confirm dashboard and alert dependencies first.
- The file service discovery target example was labeled JSON but contained `//` comments, which are invalid JSON. Moved those comments into surrounding Markdown so the JSON snippet parses correctly.
- The Prometheus reload command did not mention that `/-/reload` requires `--web.enable-lifecycle`. Added the required caveat.
- The Grafana dashboard import command posted raw dashboard JSON to `/api/dashboards/db`, but Grafana's legacy import endpoint expects a wrapper object with `dashboard` and related top-level fields. Wrapped the dashboard with `jq` and set `overwrite: true`.
- The custom Grafana dashboard used `{{osd}}` for OSD latency, but Ceph daemon metrics use `ceph_daemon`. Updated the legend format.
- The pool usage panel and pool variable expected a `name` label directly on `ceph_pool_stored_raw`. Ceph exposes pool names through `ceph_pool_metadata`, joined by `pool_id`. Updated the PromQL joins and variable query.
- The `ceph_health_detail` metric was described as a direct count, but Ceph exposes it per health-check name and severity. Changed the example to `sum(ceph_health_detail)`.
- Several pool metric examples filtered by `pool="<pool_name>"`; Ceph pool metrics are keyed by `pool_id`, with names supplied by `ceph_pool_metadata`. Updated the examples to use `pool_id`.
- The OSD utilization examples used `ceph_osd_utilization`, which is not used by the official current Ceph mixin. Replaced it with `(ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) * 100`.
- The slow-ops alert used `ceph_osd_slow_ops`; current Ceph monitoring exposes slow operations through health metrics such as `ceph_daemon_health_metrics{type="SLOW_OPS"}`. Updated the metric.
- The slow-ops runbook command built `osd.osd.0` when `ceph_daemon` already contains `osd.0`. Fixed it to `ceph daemon {{ $labels.ceph_daemon }} perf dump`.
- The critical capacity alert suggested "enable full ratio bypass", which is not a precise Ceph operation. Reworded it to describe temporarily raising the full ratio only after assessing risk.
- The Bash health-check script used `((issues_found++))` under `set -euo pipefail`. In Bash, post-increment returns status 1 when the old value is 0, causing premature exit. Replaced increments with `((issues_found+=1))`.
- The health-check script queried only the first `ceph_pg_degraded` series. Changed it to `sum(ceph_pg_degraded)`.
- The RBD latency examples divided cumulative `_sum` by `_count` directly. Updated them to divide rates over a range, matching Prometheus counter usage.
- The troubleshooting section used `ceph log last 100 mgr` as a manager daemon log command. Replaced it with the documented `cephadm logs --name mgr.<mgr-id> -- -n 100` pattern.
- The post treated the MGR Prometheus module as the source of all metrics. Newer Ceph deployments normally expose daemon performance counters through `ceph_exporter`. Added notes about `ceph_exporter` and the `mgr/prometheus/exclude_perf_counters` fallback.
- The authentication and TLS comments implied that the Ceph MGR Prometheus module itself requires auth or HTTPS. Clarified that those settings apply when scraping through a reverse proxy or load balancer.

## Review Notes
The post is technically relevant and useful after the fixes. Some alert thresholds remain example values that operators should tune for their hardware, Ceph release, and SLOs. The examples assume that the Prometheus scrape targets expose the metric families referenced by the dashboards and alerts; on newer Ceph releases this may require scraping `ceph_exporter` or intentionally re-enabling MGR perf-counter export.
