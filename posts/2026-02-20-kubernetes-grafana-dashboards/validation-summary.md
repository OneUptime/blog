# Validation Summary: Essential Grafana Dashboards for Kubernetes Monitoring

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Grafana
- Prometheus
- PromQL
- kube-prometheus-stack
- kube-state-metrics
- node_exporter
- Kubernetes ConfigMaps

## Sources Consulted
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/kubectl-cmds/
- Kubernetes port-forward task documentation: https://kubernetes.io/docs/tasks/access-application-cluster/port-forward-access-application-cluster/
- Grafana dashboard import documentation: https://grafana.com/docs/grafana/latest/dashboards/export-import/
- Prometheus PromQL operators documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- kube-prometheus-stack chart values: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- kube-prometheus-stack chart README: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/README.md
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- kube-state-metrics node metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/cluster/node-metrics.md
- kube-state-metrics ResourceQuota metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- Grafana.com dashboard API for dashboard IDs 7249, 1860, 15760, and 15762: https://grafana.com/api/dashboards/1860

## Issues Found
- The kube-prometheus-stack Grafana access snippet implied the service is always named `prometheus-grafana`. The service name depends on the Helm release name, so I added a note to replace it with `<release-name>-grafana` when needed.
- The Grafana password comment only mentioned a value set in `values.yaml`. The chart supports `grafana.adminPassword`, but when it is not explicitly set the password comes from the generated admin password secret. I corrected the comment.
- The cluster overview comment said "Total pods running vs capacity", but the query only counts running pods. I changed the comment to "Total running pods".
- The ResourceQuota percentage query divided `kube_resourcequota{type="used"}` by `kube_resourcequota{type="hard"}` without ignoring the `type` label. Prometheus binary vector matching requires labels to match unless ignored, so the original expression would not return matching series. I changed it to use `ignoring(type)`.
- The container-state section described waiting, running, and terminated states but only listed waiting and terminated reason metrics. I added `kube_pod_container_status_running`.
- The Grafana alert example used a direct cAdvisor memory-limit division that can fail due to label matching differences. I replaced it with an aggregated pod-level expression using `container_memory_working_set_bytes` and `kube_pod_container_resource_limits`.

## Review Notes
The PromQL examples assume metrics from kube-state-metrics, node_exporter, and kubelet/cAdvisor are scraped with conventional labels as provided by kube-prometheus-stack. Some community dashboard IDs can change ownership or revisions over time, but the referenced IDs were present and plausible during review.
