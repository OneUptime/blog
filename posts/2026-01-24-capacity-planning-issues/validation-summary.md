# Validation Summary: How to Fix 'Capacity Planning' Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Horizontal Pod Autoscaler
- Vertical Pod Autoscaler
- Prometheus and PromQL
- Grafana
- kube-state-metrics
- kubectl
- Bash
- Python
- pandas
- Mermaid

## Sources Consulted
- Kubernetes Horizontal Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Vertical Pod Autoscaling documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/vertical-pod-autoscale/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl top pod reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_pod/
- Kubernetes kubectl scale reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_scale/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- pandas DataFrame resample documentation: https://pandas.pydata.org/docs/reference/api/pandas.DataFrame.resample.html

## Issues Found
- The PromQL peak CPU query used `max by (service)` over the current 5-minute rate vector, which did not calculate a peak over the previous 24 hours. Changed it to use `max_over_time(...[24h:5m])` before aggregating by service.
- The memory percentage query aggregated only by `container`, which can merge unrelated containers with the same name across pods and namespaces. Changed the aggregation labels to `namespace`, `pod`, and `container`.
- The CPU alert divided averaged pod CPU usage by averaged CPU limits. For pod-level capacity, summing container usage and summing container CPU limits is the correct calculation. Updated the query to use `sum by (namespace, pod)` and filter CPU limits with `unit="core"`.
- The HPA section omitted the requirement that resource utilization targets are based on container resource requests. Added a short note so the HPA example is interpreted correctly.
- The Python forecasting example converted `daily_avg.iloc[-1]` and related values directly to `float`, which fails if the metrics input has more than one numeric column. Updated the function to select a single numeric metric column, preferring `usage_percent` when present.
- The right-sizing shell script assumed pods could always be selected with `app=<deployment-name>`. Updated it to build the selector from the Deployment's `.spec.selector.matchLabels`, matching how Deployments select their pods.

## Review Notes
The Kubernetes YAML examples are syntactically valid as examples, but real clusters still need the surrounding operational pieces that are outside this post's scope, such as Prometheus RBAC/service account configuration, VPA installation, metrics-server availability for `kubectl top`, and RBAC for the CronJob that runs `kubectl scale`.
