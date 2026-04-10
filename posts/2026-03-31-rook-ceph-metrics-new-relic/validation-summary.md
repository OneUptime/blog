# Validation Summary: How to Set Up Ceph Metrics in New Relic

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Kubernetes operator for Ceph)
- Ceph (distributed storage system)
- Ceph Manager Prometheus module
- New Relic (observability platform)
- Prometheus remote_write
- Prometheus Operator CRD (monitoring.coreos.com/v1)
- New Relic Kubernetes integration (nri-bundle Helm chart)
- NRQL (New Relic Query Language)
- New Relic NerdGraph API
- Kubernetes (kubectl, Helm, DNS)

## Sources Consulted
- Ceph Manager Prometheus module documentation: https://docs.ceph.com/en/latest/mgr/prometheus/
- Ceph Prometheus module source code: https://github.com/ceph/ceph/blob/main/src/pybind/mgr/prometheus/module.py
- Ceph Prometheus alert rules (canonical formulas): https://github.com/ceph/ceph/blob/main/monitoring/ceph-mixin/prometheus_alerts.yml
- Rook Ceph monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- New Relic Prometheus remote_write integration setup: https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/install-configure-remote-write/set-your-prometheus-remote-write-integration/
- New Relic view and query Prometheus data: https://docs.newrelic.com/docs/infrastructure/prometheus-integrations/view-query-data/view-query-your-prometheus-data/
- New Relic NerdGraph NRQL condition alerts API: https://docs.newrelic.com/docs/apis/nerdgraph/examples/nerdgraph-api-nrql-condition-alerts/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- New Relic Helm charts repository: https://github.com/newrelic/helm-charts
- Prometheus configuration reference (remote_write): https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found

### 1. Pool capacity NRQL query used incorrect formula
- **What was wrong:** The NRQL query for pool capacity utilization used `latest(ceph_pool_bytes_used) / latest(ceph_pool_max_avail) * 100`. Since `ceph_pool_max_avail` represents remaining available bytes (not total capacity), this formula produces incorrect results. For example, 60 GB used with 40 GB available would yield 150% instead of the correct 60%.
- **What was changed:** Updated the formula to `latest(ceph_pool_bytes_used) / (latest(ceph_pool_bytes_used) + latest(ceph_pool_max_avail)) * 100`, which correctly computes utilization as `used / total * 100`. This matches the canonical Ceph formula used in the official Prometheus alert rules at `ceph/monitoring/ceph-mixin/prometheus_alerts.yml`.
- **Why:** The denominator must be total capacity (`used + available`), not just available space.

### 2. Alert creation used APM-specific CLI command instead of NRQL condition
- **What was wrong:** The `newrelic alerts conditions create` command used `--condition-scope "application"` and `--metric "ceph_health_status"`, which are flags for APM alert conditions. These do not work for Prometheus metrics stored in the `Metric` data type. Prometheus metrics require NRQL alert conditions.
- **What was changed:** Replaced the incorrect CLI command with a NerdGraph API call using `curl` to create an NRQL static alert condition via the `alertsNrqlConditionStaticCreate` mutation. This is the documented and recommended approach for creating NRQL alert conditions programmatically.
- **Why:** The New Relic CLI does not have a straightforward subcommand for creating NRQL alert conditions. The NerdGraph API is the correct programmatic approach, as documented at https://docs.newrelic.com/docs/apis/nerdgraph/examples/nerdgraph-api-nrql-condition-alerts/.

## Review Notes
- The `bearer_token` field used in the prometheus.yml remote_write config (Step 2) is a legacy authentication method. For Prometheus v2.26+, the recommended approach is `authorization: { credentials: <KEY> }`. However, `bearer_token` still works and the Prometheus Operator CRD section already demonstrates the modern `authorization.credentials` pattern, so this was not changed.
- The New Relic remote_write endpoint shown is the US datacenter endpoint. EU datacenter users would need `https://metric-api.eu.newrelic.com/prometheus/v1/write` instead. The post does not mention this, which could be noted in a future update.
- All Ceph metric names (`ceph_health_status`, `ceph_osd_up`, `ceph_osd_in`, `ceph_pool_bytes_used`, `ceph_pool_max_avail`, `ceph_mon_quorum_status`) are correct and verified against the Ceph manager Prometheus module source code.
- The Rook-Ceph service name, namespace, port (9283), and Kubernetes DNS name are all correct.
- The Helm chart name (`newrelic/nri-bundle`) and repo URL (`https://helm-charts.newrelic.com`) are correct.
- NRQL `FROM Metric` is the correct data type for querying Prometheus metrics ingested via remote_write.
