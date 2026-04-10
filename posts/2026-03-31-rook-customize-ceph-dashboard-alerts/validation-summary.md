# Validation Summary: How to Customize Ceph Dashboard Alerts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook (Kubernetes Ceph operator)
- Ceph Dashboard (MGR module)
- Prometheus (alerting rules, PromQL)
- Prometheus Operator (PrometheusRule CRD)
- Alertmanager (routing, silences)
- PagerDuty, Slack, Email notification integrations

## Sources Consulted
- Ceph Prometheus Module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Rook Ceph Monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Rook GitHub source (ceph-monitoring.md): https://github.com/rook/rook/blob/master/Documentation/Storage-Configuration/Monitoring/ceph-monitoring.md
- Prometheus template reference (humanizePercentage): https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Alertmanager configuration reference: https://prometheus.io/docs/alerting/latest/configuration/
- PagerDuty Prometheus integration guide: https://www.pagerduty.com/docs/guides/prometheus-integration-guide/
- Ceph tracker issue #39652 (metric renames): https://tracker.ceph.com/issues/39652
- DigitalOcean ceph_exporter metrics (for comparison): https://github.com/digitalocean/ceph_exporter/blob/main/METRICS.md

## Issues Found

1. **Invalid metric `ceph_osd_utilization`**: This metric does not exist in the Ceph MGR Prometheus module used by Rook. Replaced with `(ceph_osd_stat_bytes_used / ceph_osd_stat_bytes)` which returns a 0-1 ratio. Updated thresholds from `> 85` / `> 80` to `> 0.85` / `> 0.80` accordingly. This also fixes the `humanizePercentage` template function usage, which expects a ratio (not a raw percentage value).

2. **Incorrect PrometheusRule resource name**: The post referenced `rook-prometheus-rules` but the actual default Rook PrometheusRule is named `prometheus-ceph-rules`. Fixed the kubectl command.

3. **Deprecated pool metric `ceph_pool_bytes_used`**: Renamed to `ceph_pool_stored` in modern Ceph versions (Nautilus+). Updated the CephPoolNearFull expression to use `ceph_pool_stored`.

4. **Incorrect pool utilization formula**: The original expression `ceph_pool_bytes_used / ceph_pool_max_avail` does not represent pool utilization as a percentage of total capacity. Fixed to `ceph_pool_stored / (ceph_pool_stored + ceph_pool_max_avail)` which correctly computes the ratio of used to total capacity.

5. **Missing default receiver in Alertmanager config**: The route referenced `receiver: 'default'` but no receiver named `default` was defined. Alertmanager validates receiver references at config load time and would reject this config. Changed to `receiver: 'slack'` which is defined and serves as a reasonable catch-all.

6. **Deprecated PagerDuty `service_key`**: The `service_key` field is for the legacy PagerDuty Events API v1. Modern PagerDuty integrations use `routing_key` with Events API v2. Updated to `routing_key`.

7. **Incorrect label `host` in annotation**: The Ceph OSD metrics use the label `hostname`, not `host`. Fixed in the custom alert annotation template.

## Review Notes
- The `ceph_health_status == 2` expression for HEALTH_ERR is correct (0=OK, 1=WARN, 2=ERR).
- The Alertmanager `match` routing directive is deprecated in newer versions in favor of `matchers`, but still works. Not changed to avoid scope creep.
- The Alertmanager silence API v2 endpoint and JSON body format are correct.
- The port-forward command and Dashboard URL path are correct for Rook Ceph deployments.
