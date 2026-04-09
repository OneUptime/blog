# Validation Summary: How to Set Up Prometheus Alerts for Rook-Ceph with Helm

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Rook (Ceph storage orchestrator for Kubernetes)
- Ceph (distributed storage system)
- Prometheus (monitoring and alerting)
- PrometheusRule (Prometheus Operator custom resource)
- Kubernetes
- Helm
- kube-prometheus-stack Helm chart

## Sources Consulted
- Rook official documentation — Ceph Monitoring: https://rook.io/docs/rook/latest/Storage-Configuration/Monitoring/ceph-monitoring/
- Rook Helm chart documentation — Operator chart: https://rook.io/docs/rook/latest/Helm-Charts/operator-chart/
- Rook Helm chart documentation — Cluster chart: https://rook.io/docs/rook/latest/Helm-Charts/ceph-cluster-chart/
- Rook GitHub repository — monitoring examples directory: https://github.com/rook/rook/tree/master/deploy/examples/monitoring
- Rook GitHub repository — localrules.yaml (current Prometheus alert rules): https://raw.githubusercontent.com/rook/rook/master/deploy/examples/monitoring/localrules.yaml

## Issues Found

1. **Wrong Helm chart name in upgrade command**: The post used `rook-release/rook-ceph` (the operator chart) for the `helm upgrade` command, but `monitoring.createPrometheusRules` is a value in the `rook-ceph-cluster` chart, not the operator chart. The operator chart only has `monitoring.enabled`. Changed to `rook-release/rook-ceph-cluster`.

2. **Outdated GitHub URL for alert rules (Option 2)**: The URL referenced `prometheus-ceph-v14.yaml`, which refers to Ceph Nautilus (v14.x), a long-EOL release. This file no longer exists on the Rook master branch. The current alerting rules file is `localrules.yaml`. Updated the URL accordingly.

3. **Incorrect CephOSDNearFull threshold**: Listed as "above 80%" but the Ceph default `mon_osd_nearfull_ratio` is 0.85 (85%). The PrometheusRule checks the Ceph health detail flag `OSD_NEARFULL`, which fires at the Ceph-configured nearfull ratio. Corrected to 85%.

4. **Incorrect CephPoolNearFull threshold**: Listed as "above 70%" but the default nearfull ratio in Ceph is 85%. The PrometheusRule checks the `POOL_NEAR_FULL` health detail flag. Corrected to 85%.

5. **Wrong alert name CephPGUnavailable**: This alert does not exist in the current Rook PrometheusRules. The correct name is `CephPGUnavailableBlockingIO`. Updated with corrected name and description.

6. **Wrong alert name CephMgrIsAbsent**: This alert does not exist in the current Rook PrometheusRules. The correct name is `CephMgrPrometheusModuleInactive`. Updated with corrected name and description.

7. **Inconsistent ruleSelector label in Option 3**: The kube-prometheus-stack `ruleSelector` used `role: alert-rules`, but the Rook Helm chart (shown in Option 1) applies the label `release: kube-prometheus-stack` to PrometheusRule objects. The ruleSelector must match the labels on the PrometheusRule. Changed to `release: kube-prometheus-stack` for consistency.

## Review Notes
- The `kubernetes.io/metadata.name` label referenced in Option 3 is automatically applied by Kubernetes 1.21+. On clusters running 1.21+, the `kubectl label namespace` command would fail unless `--overwrite` is added. This is a minor usability note, not a correctness issue, since older clusters may still need it.
- The `values.yaml` snippet in Option 1 shows the `prometheusRule.labels` and `prometheusRule.annotations` structure, which is correctly from the `rook-ceph-cluster` chart. The mismatch was only in the `helm upgrade` command.
- The Prometheus API queries in the "Test an Alert Rule" and "View Firing Alerts" sections are syntactically correct and functional.
