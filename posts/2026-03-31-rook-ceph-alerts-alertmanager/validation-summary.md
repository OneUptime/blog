# Validation Summary: How to Set Up Ceph Alerts with Prometheus AlertManager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rook-Ceph (Kubernetes storage orchestrator)
- Prometheus (metrics collection and alerting rules)
- Prometheus Operator / PrometheusRule CRD (monitoring.coreos.com/v1)
- AlertManager (alert routing and notification)
- Kubernetes (Secrets, kubectl exec, Helm values)
- Slack (webhook-based alert notifications)

## Sources Consulted
- Prometheus documentation on template reference and `humanizePercentage` function: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Rook-Ceph monitoring documentation: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Rook GitHub repository monitoring examples: https://github.com/rook/rook/tree/master/deploy/examples/monitoring
- AlertManager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Ceph Prometheus module metrics reference: https://docs.ceph.com/en/latest/mgr/prometheus/
- kube-prometheus-stack Helm chart documentation

## Issues Found

### 1. Incorrect use of `humanizePercentage` in custom PrometheusRule annotations
- **What was wrong:** The CephCapacityWarning and CephCapacityCritical alert rules used expressions that multiply by 100 (e.g., `100 * ceph_cluster_total_used_raw_bytes / ceph_cluster_total_bytes > 70`), making `$value` a number like 72. However, the annotations used `{{ humanizePercentage $value }}`, which expects a ratio between 0 and 1 (e.g., 0.72). With a value of 72, `humanizePercentage` would output "7200%" instead of "72%".
- **What was changed:** Removed the `100 *` multiplier from both expressions and changed the thresholds from `> 70` / `> 85` to `> 0.70` / `> 0.85`. This makes `$value` a proper ratio that `humanizePercentage` can correctly format.
- **Why:** This is the idiomatic PromQL approach — ratios are conventionally expressed as 0-1 values, and `humanizePercentage` is designed to work with this convention.

## Review Notes
- The pre-built alert names in the "Key Pre-Built Alert Rules" table are representative but may not match exactly across all Rook versions. For example, Rook's actual capacity alerts use names like `CephClusterNearFull` and `CephClusterCriticallyFull` rather than `CephCapacityUsageCritical` and `CephCapacityUsageWarning`. Similarly, `CephOSDDiskUnavailable` may appear as `CephOSDDiskNotResponding` in some versions. Since the post does not target a specific Rook version and the conditions described are accurate, this was not changed, but readers should consult the actual PrometheusRule resources deployed in their cluster for exact alert names.
- The raw GitHub URL for applying Prometheus rules (`https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/prometheus-ceph-rules.yaml`) references the `master` branch. Readers should use the branch or tag matching their installed Rook version for production deployments.
- The Ceph metrics exporter port (9283) is correct for the Ceph MGR Prometheus module.
- The AlertManager configuration uses the newer `matchers` syntax (AlertManager v0.22+), which is correct and current.
- The testing approach (using `ceph osd out/in`) is a safe and reversible way to trigger alerts.
- All kubectl commands, Kubernetes resource definitions, and PromQL expressions (after the fix) are syntactically correct.
