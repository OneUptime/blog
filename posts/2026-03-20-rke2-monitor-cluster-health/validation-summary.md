# Validation Summary: How to Monitor RKE2 Cluster Health

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RKE2
- Kubernetes
- kubectl
- etcd and etcdctl
- Helm
- Rancher Monitoring
- Prometheus
- Prometheus Operator PrometheusRule
- Grafana
- node-exporter and kube-state-metrics

## Sources Consulted
- RKE2 Cluster Access documentation: https://docs.rke2.io/cluster_access
- RKE2 Metrics documentation: https://docs.rke2.io/reference/metrics
- Kubernetes API health endpoints documentation: https://kubernetes.io/docs/reference/using-api/health-checks/
- Kubernetes ComponentStatus API reference: https://kubernetes.io/docs/reference/kubernetes-api/cluster-resources/component-status-v1/
- Kubernetes EndpointSlice deprecation announcement: https://kubernetes.io/blog/2025/04/24/endpoints-deprecation/
- kubectl top node reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- etcd cluster status documentation: https://etcd.io/docs/v3.6/tasks/operator/how-to-check-cluster-status/
- Rancher Monitoring and Alerting documentation: https://ranchermanager.docs.rancher.com/v2.14/integrations-in-rancher/monitoring-and-alerting
- Rancher chart repository index and chart archives: https://charts.rancher.io/index.yaml
- Prometheus Kubernetes service discovery configuration: https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.PrometheusRule

## Issues Found
- The post used `kubectl get componentstatuses`, but the ComponentStatus API is deprecated in Kubernetes v1.19 and later. Replaced it with `kubectl get --raw='/readyz?verbose'`, which matches the current Kubernetes health endpoint guidance.
- The pod status grep examples did not use `--no-headers`, so the header row would always appear as a non-running pod. Added `--no-headers` to both examples.
- The post stated that RKE2 includes a built-in monitoring chart. RKE2 includes packaged components such as metrics-server, while Rancher provides the `rancher-monitoring` chart. Updated the section heading, explanation, and conclusion to refer to Rancher Monitoring.
- The Helm example pinned an outdated/incomplete chart version and omitted the separate CRD chart needed when installing Rancher Monitoring directly with Helm. Updated the example to install `rancher-monitoring-crd` first and use the current matching chart version `109.0.0+up80.9.1-rancher.5`.
- The Grafana access example implied a LoadBalancer IP would be available by default. Changed the comment to inspect the Grafana Service instead.
- The manual Prometheus scrape config used `role: endpoints`, but Kubernetes v1.33 deprecated the Endpoints API and Prometheus recommends `endpointslice`. Updated the API server scrape job to use `role: endpointslice` and EndpointSlice meta labels.
- The node-exporter scrape job used `role: node`, which discovers Kubernetes node targets rather than a node-exporter Service. Updated it to use EndpointSlice discovery for a `node-exporter` Service in the `monitoring` namespace.
- The alerting section used the Prometheus Operator `PrometheusRule` CRD without saying that an Operator-based deployment is required. Updated the introduction to specify Rancher Monitoring or another Prometheus Operator deployment.
- The description mentioned OneUptime, but the post does not configure or discuss OneUptime. Removed that reference from the description.

## Review Notes
- The Rancher Monitoring chart version should be kept aligned with the target Rancher and Kubernetes/RKE2 versions; the example version was current in the Rancher chart repository at review time and targets Rancher v2.14/Kubernetes v1.33-v1.35.
- The standalone Prometheus snippet assumes the Prometheus ServiceAccount has RBAC to discover EndpointSlices and that a node-exporter Service named `node-exporter` exists in the `monitoring` namespace.
