# Validation Summary: How to View Cluster Metrics in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Kubernetes
- metrics-server
- Rancher Monitoring (`rancher-monitoring`)
- Prometheus
- Grafana
- Alertmanager
- Prometheus Operator CRDs (`PrometheusRule`, `AlertmanagerConfig`)
- `kubectl`
- PromQL

## Sources Consulted
- Rancher Access Clusters: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/new-user-guides/manage-clusters/access-clusters
- Rancher Enable Monitoring: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-alerting-guides/enable-monitoring
- Rancher Monitoring and Alerting overview: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/monitoring-and-alerting
- Rancher How Monitoring Works: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/monitoring-and-alerting/how-monitoring-works
- Rancher Helm Chart Options: https://ranchermanager.docs.rancher.com/v2.14/reference-guides/monitoring-v2-configuration/helm-chart-options
- Rancher Prometheus Configuration: https://ranchermanager.docs.rancher.com/v2.14/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheus
- Rancher Built-in Dashboards: https://ranchermanager.docs.rancher.com/v2.11/integrations-in-rancher/monitoring-and-alerting/built-in-dashboards
- Rancher Receiver Configuration: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/monitoring-v2-configuration/receivers
- Rancher PrometheusRules configuration: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides/advanced-configuration/prometheusrules
- Kubernetes `kubectl top` reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands/#top
- Metrics Server official repository and install docs: https://github.com/kubernetes-sigs/metrics-server
- RKE2 packaged components: https://docs.rke2.io/install/packaged_components
- RKE2 requirements: https://docs.rke2.io/install/requirements
- K3s server CLI reference: https://docs.k3s.io/cli/server
- Rancher Monitoring chart values: https://github.com/rancher/charts/blob/main/charts/rancher-monitoring/values.yaml
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Grafana Helm installation docs: https://grafana.com/docs/grafana/latest/installation/helm/

## Issues Found
1. **Outdated Cluster Dashboard navigation**: The post said clicking a cluster name in `Cluster Management` immediately opens the dashboard. Updated this to the current documented `Explore` flow.

2. **Over-specific default dashboard description**: The original text described a fixed set of default dashboard metrics that did not line up with the current Rancher cluster dashboard documentation. I revised this to the documented cluster dashboard information and clarified that live resource usage depends on `metrics-server`.

3. **Outdated Monitoring installation path**: The post instructed readers to install Monitoring from `Apps > Charts`. Updated this to the current standard Rancher flow via `Cluster Tools > Monitoring > Install`.

4. **Incorrect Prometheus UI label**: Updated `Prometheus` to `Prometheus Graph`, which is the documented Rancher UI entry for opening the Prometheus expression browser.

5. **Outdated alerting UI paths**: Updated `Monitoring > Alert Rules` to `Monitoring > Advanced > Prometheus Rules`, and `Monitoring > Alertmanager Configs` to `Monitoring > Alerting > AlertManagerConfigs`. I also corrected the receiver workflow so an `AlertManagerConfig` is created before adding receivers.

6. **CLI command normalization**: Updated `kubectl top` examples to the current official command forms shown in the Kubernetes reference (`kubectl top node`, `kubectl top pod -A`).

## Review Notes
- The Rancher monitoring stack content is version-sensitive because Rancher closely tracks `kube-prometheus-stack`; dashboard names and exact UI wording can vary slightly by Rancher release.
- The Prometheus, Grafana, and Alertmanager value snippets are valid examples, but production sizing should still be adjusted to the cluster size and Rancher’s documented resource requirements.
