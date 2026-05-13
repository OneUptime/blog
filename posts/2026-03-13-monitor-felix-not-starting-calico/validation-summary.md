# Validation Summary: How to Monitor Felix Not Starting in Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Felix
- Kubernetes
- kube-state-metrics
- Prometheus Operator
- Prometheus alerting rules

## Sources Consulted
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico component metrics guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico Felix Prometheus metric reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- Prometheus Operator API stability documentation: https://github.com/prometheus-operator/prometheus-operator

## Issues Found
- The post stated the readiness `wget` command "returns 200". `wget -qO-` does not print the status code in this form; it exits successfully when the endpoint returns HTTP 200. Updated the comment to describe the actual behavior.
- The post implied the Felix health endpoint is always available. Calico documents the health port as enabled when `HealthEnabled`/`FELIX_HEALTHENABLED` is true, with port 9099 as the default. Updated the wording to say "when Felix health checks are enabled."
- The Prometheus alert used `felix_iptables_restore_errors_total`, but the current Calico Felix metric reference documents the metric as `felix_iptables_restore_errors`. Updated the alert expression.
- The diagram said Prometheus scrapes the readiness endpoint via PodMonitor, but the YAML alert uses `kube_pod_status_ready` from kube-state-metrics. Updated the diagram labels to reflect kube-state-metrics for pod readiness and Felix metrics for iptables errors.
- The conclusion called the iptables signal a counter; the documented metric name does not use the Prometheus `_total` counter convention. Updated the wording to "metrics."

## Review Notes
The examples assume Calico runs in `kube-system`; operator-based Calico installs commonly use `calico-system`, so readers may need to adjust the namespace and pod selector for their installation.
