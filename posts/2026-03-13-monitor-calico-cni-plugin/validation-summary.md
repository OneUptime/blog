# Validation Summary: Monitor Calico CNI Plugin

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Calico CNI
- Calico IPAM and calicoctl
- Kubernetes and kubectl
- Prometheus alerting rules and PromQL
- Grafana Loki and LogQL
- kube-state-metrics
- Grafana

## Sources Consulted
- Calico calicoctl ipam show documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico calicoctl ipam check documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- Calico calicoctl get documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico WorkloadEndpoint resource documentation: https://docs.tigera.io/calico/latest/reference/resources/workloadendpoint
- Calico Felix Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico component versions documentation: https://docs.tigera.io/calico/latest/reference/component-versions
- Grafana Loki metric query documentation: https://grafana.com/docs/loki/latest/query/metric_queries/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Kubernetes kubectl create cronjob reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md

## Issues Found
- The IPAM metrics script used `calicoctl ipam show --output=json`, but the documented `ipam show` command does not support `--output=json`. Updated the script to use the documented `calicoctl ipam show --show-blocks` output and parse IP Pool rows.
- The introduction said WorkloadEndpoint creation failures mean pods start without network policy enforcement. Calico documentation describes WorkloadEndpoints as policy-bearing endpoint resources managed by the CNI plugin, so the wording was narrowed to say failures can prevent Calico from programming policy for a workload endpoint.
- The Loki alert used `rate()` while the diagram and alert threshold described "errors/5m". Updated the LogQL expression to use `count_over_time(...[5m])` so it counts log entries in the five-minute window.
- The WorkloadEndpoint alert subtracted a scalar from individual `kube_pod_status_phase` series and did not account for host-network pods. Updated it to compare the documented Felix `felix_cluster_num_workload_endpoints` metric against summed running non-host-network pod series.
- The pod start-time check used `"Created container"` events, which do not directly indicate CNI execution. Updated the section to check pod sandbox creation failure events, where CNI setup failures commonly surface.
- The `calico/ctl` image tag was pinned to `v3.27.0`. Updated it to the current documented Calico component version, `v3.32.0`.

## Review Notes
The IPAM utilization script now relies on parsing `calicoctl ipam show --show-blocks` table output because `calicoctl` does not document structured output for this subcommand. For production monitoring, a dedicated exporter or direct API-based collector would be more robust.
