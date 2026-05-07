# Validation Summary: How to Set Up Monitoring for Specific Namespaces in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- Prometheus Operator
- Prometheus / PromQL
- Alertmanager
- Grafana
- kube-state-metrics
- cAdvisor

## Sources Consulted
- Rancher docs, Persistent Grafana Dashboards: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-alerting-guides/create-persistent-grafana-dashboard
- Rancher docs, ServiceMonitor and PodMonitor Configuration: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/monitoring-v2-configuration/servicemonitors-and-podmonitors
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus docs, Alertmanager configuration: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus docs, PromQL operators and vector matching: https://prometheus.io/docs/prometheus/latest/querying/operators/
- kube-state-metrics docs, ResourceQuota metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- kube-state-metrics docs, Pod metrics: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics docs index: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/README.md
- cAdvisor Prometheus metrics reference: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Kubernetes docs, Node metrics data: https://kubernetes.io/docs/reference/instrumentation/node-metrics/
- Kubernetes docs, Network Policies: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The restricted Prometheus example only narrowed `serviceMonitorNamespaceSelector`, but left `podMonitorNamespaceSelector` and `ruleNamespaceSelector` cluster-wide. I updated the example so all three namespace selectors are restricted consistently.
- The `ProductionPodNotReady` alert expression only detected pods in `Pending` or `Unknown` phase, while the annotation said "not ready." I corrected the alert text so it accurately describes what the query detects.
- The `ProductionHighErrorRate` and `ProductionHighMemoryUsage` alerts did not preserve a `namespace` label in the alert output, which would break the later Alertmanager namespace routes. I added a static `namespace: production` alert label to both rules.
- The Grafana ConfigMap used `cattle-monitoring-system` and a `grafana_folder` annotation. Rancher’s dashboard persistence docs use the `cattle-dashboards` namespace by default, and the folder annotation shown in the post was not aligned with the documented default setup. I changed the namespace and removed the non-default annotation from the example.
- The "Pod Restarts" dashboard panel queried restarts per container while formatting the legend as `{{ pod }}`, which can produce duplicate pod legends. I changed the query to aggregate restarts by pod.
- The ResourceQuota PromQL examples divided `kube_resourcequota{type="used"}` by `kube_resourcequota{type="hard"}` without vector matching. Because `type` is part of the label set, those queries would not match as written. I corrected them with `ignoring(type)`, including the alert example.
- The Alertmanager example showed Slack receivers without a webhook URL source. I added `global.slack_api_url_file` so the example is complete enough to route Slack notifications.
- The final section claimed to monitor NetworkPolicies, but the queries were cAdvisor traffic counters for namespace network usage rather than NetworkPolicy enforcement data. I renamed the section and intro to describe namespace network traffic accurately.

## Review Notes
- The `http_requests_total` alert example assumes the application exports that metric with `status` and `service` labels; that pattern is common, but it is application-specific rather than guaranteed by Rancher or Kubernetes.
- Rancher’s Grafana dashboard discovery namespace and sidecar behavior can be customized through chart values, so operators using non-default monitoring values may need to adjust the dashboard ConfigMap namespace accordingly.
