# Validation Summary: How to Set Up Kubernetes Cost Anomaly Detection Alerts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Kubecost
- OpenCost metrics
- Prometheus
- PromQL recording and alerting rules
- Alertmanager
- Helm

## Sources Consulted
- Kubecost self-hosted 2.x documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x
- Kubecost metrics documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/2.x?topic=overview-kubecost-metrics
- Kubecost Allocation API documentation: https://www.ibm.com/docs/en/kubecost/self-hosted/3.x?topic=apis-allocation-api
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/

## Issues Found
- The original recording rules referenced non-standard or incorrect metric names such as `kubecost_cluster_cost_hourly`, `kubecost_node_cpu_hourly_cost`, `kubecost_node_ram_hourly_cost`, and `kubecost_persistentvolume_cost`. Replaced them with PromQL based on Kubecost/OpenCost metrics including `container_cpu_allocation`, `container_memory_allocation_bytes`, `node_cpu_hourly_cost`, `node_ram_hourly_cost`, `pod_pvc_allocation`, and `pv_hourly_cost`.
- The original daily cost rule used `sum_over_time` on an hourly cost gauge, which would scale with scrape count rather than calculate a daily dollar estimate. Changed it to `avg_over_time(...[24h]) * 24`.
- The original CPU anomaly alert used `rate()` on hourly cost gauge data. Replaced it with `avg_over_time()` comparisons, which are appropriate for gauge-style hourly cost metrics.
- The original examples created standalone ConfigMaps for Prometheus rule files and then reloaded Prometheus. Standalone ConfigMaps are not loaded unless Prometheus is configured to mount and reference them. Changed the examples to use Helm values under the bundled Prometheus chart's `serverFiles`.
- The original Alertmanager example used deprecated `match` routing syntax and the deprecated PagerDuty `service_key` field. Updated the routing syntax to `matchers` and changed PagerDuty configuration to `routing_key`.
- The original Alertmanager ConfigMap application would not necessarily update the Alertmanager configuration used by the bundled chart. Changed the example to apply the Alertmanager configuration through Helm values.
- The original Prometheus service name used for port-forwarding was too generic for the Kubecost Helm release. Updated it to `kubecost-prometheus-server`.
- The original install snippet mixed chart-value assumptions. Updated the cluster identity settings to values consistent with the Kubecost cost-analyzer chart path used by the tutorial.

## Review Notes
The tutorial is technically relevant and implementation-focused. The examples are aligned with Kubecost's cost-analyzer chart style rather than the newer Kubecost 3.x chart. A future refresh could add an explicit version note or a separate Kubecost 3.x installation path.
