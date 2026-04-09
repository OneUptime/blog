# Validation Summary: How to Set Up Health-Based Alerts for Ceph HA Monitoring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage)
- Prometheus (monitoring and alerting)
- Prometheus Operator (PrometheusRule CRD)
- Grafana (dashboards)
- Kubernetes (kubectl CLI)

## Sources Consulted
- Ceph MGR Prometheus module source code (metric definitions: `ceph_health_status`, `ceph_osd_up`, `ceph_mon_quorum_status`, `ceph_pg_degraded`, `ceph_osd_stat_bytes`, `ceph_osd_stat_bytes_used`)
- Rook CephCluster CRD documentation (`spec.monitoring` fields)
- Rook Helm chart `values.yaml` (for `rulesNamespaceOverride` verification)
- Prometheus Operator API reference (`monitoring.coreos.com/v1` PrometheusRule)
- Grafana dashboard registry: https://grafana.com/grafana/dashboards/2842-ceph-cluster/

## Issues Found

### 1. Non-existent metric `ceph_osd_utilization`
**What was wrong:** The disk space alerts used `ceph_osd_utilization`, which does not exist in the Ceph MGR Prometheus module.
**What was changed:** Replaced with the correct computed expression `(ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) * 100`. Also added `| humanize` to the `$value` template function for cleaner output formatting.
**Why:** `ceph_osd_stat_bytes_used` and `ceph_osd_stat_bytes` are the actual metrics exported by the Ceph MGR Prometheus module for per-OSD storage utilization.

### 2. Invalid CephCluster CRD field `rulesNamespaceOverride`
**What was wrong:** The `spec.monitoring` example included `rulesNamespaceOverride: rook-ceph`, but this is a Helm chart value (`rook-ceph-cluster` chart), not a field in the CephCluster CRD spec.
**What was changed:** Removed `rulesNamespaceOverride` from the CephCluster YAML snippet.
**Why:** Including a Helm value in the CRD spec would cause a validation error when applying the resource directly. The CephCluster CRD `spec.monitoring` section supports `enabled`, `metricsDisabled`, `port`, `interval`, and `exporter`, but not `rulesNamespaceOverride`.

### 3. Alert name mismatch: `CephPGUnavailable`
**What was wrong:** The alert was named `CephPGUnavailable` but its expression (`ceph_pg_degraded > 0`) checks for degraded placement groups, not unavailable ones. Degraded PGs still serve I/O; unavailable PGs do not.
**What was changed:** Renamed the alert to `CephPGDegraded` to accurately reflect what the expression detects.
**Why:** Alert names should match their conditions to avoid confusion during incident response.

## Review Notes
- The `CephMonQuorumAtRisk` alert uses a hardcoded threshold of `< 2` monitors in quorum. This works correctly for standard 3-monitor deployments (where quorum requires 2), but would miss quorum loss in 5-monitor setups (where quorum requires 3). A more general expression would use `count(ceph_mon_quorum_status == 1) < ceil(count(ceph_mon_metadata) / 2) + 1`, but this adds complexity. The current threshold is reasonable for the most common deployment scenario.
- Grafana dashboard ID 2842 ("Ceph Cluster") is confirmed valid on the Grafana dashboard registry.
- All other metrics (`ceph_health_status`, `ceph_osd_up`, `ceph_mon_quorum_status`, `ceph_pg_degraded`) are verified against the Ceph MGR Prometheus module source code.
- The Prometheus MGR module default port 9283 is confirmed correct.
