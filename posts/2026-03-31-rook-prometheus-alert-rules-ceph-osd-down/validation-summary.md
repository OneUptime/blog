# Validation Summary: How to Create Prometheus Alert Rules for Ceph OSD Down

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph operator for Kubernetes)
- Ceph (distributed storage system) - OSD subsystem
- Prometheus (monitoring and alerting)
- PromQL (Prometheus Query Language)
- Prometheus Operator (PrometheusRule CRD)
- Kubernetes

## Sources Consulted
- Ceph Prometheus Module metric names: https://docs.ceph.com/en/latest/mgr/prometheus/
- Prometheus `humanizePercentage` template function documentation: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- PromQL `changes()` function: https://prometheus.io/docs/prometheus/latest/querying/functions/#changes
- PromQL comparison operators (`== bool`): https://prometheus.io/docs/prometheus/latest/querying/operators/#comparison-binary-operators
- Prometheus Operator PrometheusRule CRD: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule
- Rook Ceph monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Ceph OSD troubleshooting: https://docs.ceph.com/en/latest/rados/troubleshooting/troubleshooting-osd/

## Issues Found
1. **`CephHighPercentageOSDDown` alert: incorrect use of `humanizePercentage`** — The expression `(count(ceph_osd_up == 0) / count(ceph_osd_up)) * 100 > 10` produces values like 15 (for 15%), but the annotation used `{{ $value | humanizePercentage }}`. The `humanizePercentage` function expects a ratio (0-1), not a percentage (0-100), so it would display "1500%" instead of "15%". Fixed by removing `* 100` and changing the threshold from `> 10` to `> 0.10`.

2. **`CephOSDNearFull` alert: same `humanizePercentage` issue** — The expression `(ceph_osd_stat_bytes_used / ceph_osd_stat_bytes) * 100 > 85` produces values like 87, but the annotation used `{{ $value | humanizePercentage }}`. This would display "8700%" instead of "87%". Fixed by removing `* 100` and changing the threshold from `> 85` to `> 0.85`.

## Review Notes
- All Ceph metric names (`ceph_osd_up`, `ceph_osd_in`, `ceph_osd_stat_bytes`, `ceph_osd_stat_bytes_used`) are correct for the Ceph Manager Prometheus module.
- The Ceph MGR Prometheus endpoint port 9283 is correct.
- The `sum(ceph_osd_up == bool 0)` pattern for counting down OSDs is valid PromQL using the `bool` modifier.
- The `changes()` function for flapping detection is an appropriate approach.
- The `(ceph_osd_up == 0) and (ceph_osd_in == 1)` expression correctly identifies the degraded data scenario where an OSD is down but still in the CRUSH map.
- The PrometheusRule CRD apiVersion (`monitoring.coreos.com/v1`) is correct for Prometheus Operator.
- The `ceph osd down 0` test command is valid but only marks the OSD as down temporarily; Ceph may automatically bring it back up, which is worth noting for readers.
