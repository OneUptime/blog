# Validation Summary: How to Troubleshoot Monitoring Issues in Rancher

## Status
validated

## Post Type
Guide / Troubleshooting reference

## Technologies Covered
- Rancher Monitoring / `rancher-monitoring`
- Kubernetes / `kubectl`
- Helm
- Prometheus
- Prometheus Operator
- Grafana
- Alertmanager
- kube-state-metrics
- prometheus-node-exporter

## Sources Consulted
- SUSE Rancher documentation: How Monitoring Works https://documentation.suse.com/external-tree/en-us/cloudnative/rancher-manager/v2.11/en/observability/monitoring-and-dashboards/how-monitoring-works.html
- Rancher Monitoring chart package and templates https://charts.rancher.io/assets/rancher-monitoring/rancher-monitoring-109.0.1+up80.9.1-rancher.8.tgz
- Helm CLI reference: `helm status` https://helm.sh/docs/helm/helm_status/
- Kubernetes `kubectl exec` reference https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl rollout` reference https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout
- Kubernetes kubectl quick reference https://kubernetes.io/docs/reference/kubectl/quick-reference/
- Prometheus Operator API reference https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator getting started guide https://prometheus-operator.dev/docs/developer/getting-started/
- Grafana data source management docs https://grafana.com/docs/grafana/latest/datasources/
- Grafana Prometheus data source configuration docs https://grafana.com/docs/grafana/latest/datasources/prometheus/configure/

## Issues Found
- The post said "Check Helm release status" but used `helm list`. I changed this to `helm status rancher-monitoring -n cattle-monitoring-system`, which is the Helm command that actually shows a release's status.
- The Prometheus selector example referred to `ruleSelector`, which is not the relevant selector for scrape target discovery in this context. I changed it to inspect `serviceMonitorSelector`, `podMonitorSelector`, and their namespace selectors on the `rancher-monitoring-prometheus` resource.
- The Prometheus retention lookup used a list-style jsonpath against all Prometheus objects in the namespace. I changed it to query the named `rancher-monitoring-prometheus` object directly so the command matches the default Rancher installation layout.
- The Grafana connectivity check used `kubectl exec -l ...`, but `kubectl exec` does not support label selectors. I changed it to `kubectl exec` against `deployment/rancher-monitoring-grafana`, which is supported by the Kubernetes CLI reference.
- The Grafana UI instruction said to click `Test`. Current Grafana documentation uses `Save & test`, so I updated that wording.
- The Alertmanager log command did not specify a container. I added `-c alertmanager` so the command works reliably on the multi-container Alertmanager pods created by the monitoring stack.
- The node-exporter troubleshooting commands used the old `app=prometheus-node-exporter` selector. Current Rancher chart templates use `app.kubernetes.io/name=prometheus-node-exporter`, so I updated the pod, log, and DaemonSet commands accordingly.
- The kube-state-metrics log command did not specify a container. I added `-c kube-state-metrics` for consistency and to avoid ambiguity.
- All `kubectl rollout restart` commands used unsupported `TYPE ... NAME` syntax. I changed them to the documented `RESOURCE/NAME` form, such as `deployment/rancher-monitoring-grafana`.
- The event collection command sorted by `.lastTimestamp`, which is not the current kubectl quick-reference example. I updated it to sort by `.metadata.creationTimestamp`.
- The diagnostic commands for Prometheus and Alertmanager fetched all CRs in the namespace. I changed them to the default Rancher object names `rancher-monitoring-prometheus` and `rancher-monitoring-alertmanager` to make the commands concrete and accurate.

## Review Notes
- The post assumes Rancher Monitoring is installed with Rancher's default release name `rancher-monitoring` in the namespace `cattle-monitoring-system`. If a cluster uses a custom release name or namespace, the hard-coded object names in the commands must be adjusted.
- `kubectl top pods` in the diagnostic section still depends on Metrics Server being installed and working in the cluster. The command itself is correct.
