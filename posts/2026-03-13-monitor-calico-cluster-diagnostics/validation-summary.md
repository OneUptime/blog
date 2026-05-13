# Validation Summary: How to Monitor Calico Cluster Diagnostics

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico
- Kubernetes
- Tigera Operator TigeraStatus
- Prometheus and Prometheus Operator
- kube-state-metrics
- Grafana
- Bash and awk

## Sources Consulted
- Calico documentation: Monitor Calico component metrics, https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring kube-controllers with Prometheus, https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico documentation: calicoctl ipam show, https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico documentation: TigeraStatus installation API reference, https://docs.tigera.io/calico/latest/reference/installation/api
- Kubernetes documentation: Metrics for Kubernetes Object States, https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- kube-state-metrics package documentation: customresourcestate, https://pkg.go.dev/k8s.io/kube-state-metrics/v2/pkg/customresourcestate
- Prometheus Operator API reference: PrometheusRule, https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
1. **Fabricated IPAM PromQL metric names**: The alert and dashboard used `_used / _total`, which are not documented Calico metrics. Replaced them with `sum(ipam_allocations_in_use) / sum(ipam_ippool_size)`, matching the current calico-kube-controllers metric reference.
2. **Fabricated kube-controllers sync metric**: The alert used `kube_controllers_last_sync_timestamp`, which is not in the current Calico kube-controllers metrics reference. Replaced it with an availability alert on the Prometheus `up` metric for the kube-controllers metrics target.
3. **TigeraStatus metric was not a built-in documented Calico metric**: The post used `tigera_component_available` without explaining how it is produced. Replaced it with an explicitly assumed kube-state-metrics custom resource metric, `tigerastatus_condition`, and added a note that this metric must be exported from TigeraStatus conditions.
4. **Incorrect `calicoctl ipam show` parsing**: The script grepped for `IPs in use`, but current `calicoctl ipam show` output is a table with an `IPS IN USE` column and per-pool rows. Replaced the parsing with an `awk` command that extracts the percentage from IP Pool rows.
5. **Outdated wording about kube-controllers sync lag**: The description, introduction, architecture label, and conclusion referred to sync lag/policy drift as if a documented metric existed. Updated those references to kube-controllers availability.

## Review Notes
- The TigeraStatus PromQL depends on a kube-state-metrics CustomResourceStateMetrics configuration that emits `tigerastatus_condition`; kube-state-metrics can expose custom resource state, but metric names are configuration-dependent.
- The Grafana JSON is a minimal illustrative panel snippet, not a complete importable dashboard model.
