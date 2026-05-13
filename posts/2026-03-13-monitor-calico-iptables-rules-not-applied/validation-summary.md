# Validation Summary: How to Monitor for Calico iptables Rules Not Applied

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Felix
- Kubernetes
- Prometheus and Prometheus Operator
- Grafana
- iptables
- calicoctl

## Sources Consulted
- Calico Open Source documentation: Monitoring Felix with Prometheus - https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico Open Source documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Open Source documentation: FelixConfiguration resource reference - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Open Source documentation: Component versions - https://docs.tigera.io/calico/latest/reference/component-versions
- Calico Enterprise documentation: Recommended Prometheus metrics - https://docs.tigera.io/calico-enterprise/latest/operations/monitor/metrics/recommended-metrics
- Prometheus Operator API reference for PrometheusRule - https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes documentation for CronJob - https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Linux iptables manual page - https://man7.org/linux/man-pages/man8/iptables.8.html

## Issues Found
- The post used `felix_iptables_restore_errors_total` and `felix_iptables_save_errors_total`, but the current Calico Felix metric reference documents these metrics as `felix_iptables_restore_errors` and `felix_iptables_save_errors`. Updated alert expressions, dashboard examples, the mermaid diagram, best practices, and conclusion to use the documented metric names.
- The Grafana metrics list included `felix_iptables_restore_latency_seconds`, which is not listed in the current Felix metric reference. Replaced it with `felix_int_dataplane_apply_time_seconds`, the documented dataplane apply latency metric.
- The Grafana metrics list described `felix_ipsets_in_dataplane` as the number of active Calico iptables chains. The current Felix reference documents `felix_iptables_chains` for active iptables chains. Updated the example accordingly.
- The alert section claimed to cover missing Calico chains, but the PrometheusRule did not include a chain-count alert. Added a `CalicoIptablesChainsMissing` alert using the documented `felix_iptables_chains` metric.
- The CronJob section said the job validates chains on all nodes, but a Kubernetes CronJob creates scheduled Jobs whose pods run wherever the scheduler places them. Updated the wording and comments to describe it as a scheduled node-level spot check.
- The CronJob example used `calico/node:v3.27.0`, which is older than the current Calico documentation version reviewed. Updated the example to `calico/node:v3.32.0` and noted that the image should match the installed Calico version.
- The introduction and conclusion stated that iptables errors mean policies stop being enforced and that any error increase must trigger immediate investigation. Calico's recommended metrics guidance is more precise: policies may not be up to date, and rapidly rising counters are the condition to investigate. Updated the wording to avoid overstating the failure mode.

## Review Notes
The PrometheusRule resource is syntactically consistent with the Prometheus Operator CRD, but whether Prometheus picks it up still depends on the cluster's `ruleSelector` and namespace selector configuration. The CronJob remains a spot check; full per-node validation would require a DaemonSet-style checker or node-targeted scheduling outside the narrow scope of this correction.
