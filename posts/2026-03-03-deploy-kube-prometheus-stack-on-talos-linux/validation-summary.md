# Validation Summary: How to Deploy kube-prometheus-stack on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- Kubernetes
- Helm 3
- kube-prometheus-stack (Helm chart)
- Prometheus Operator
- Prometheus
- Alertmanager
- Grafana
- node-exporter
- kube-state-metrics
- ServiceMonitor / PodMonitor / PrometheusRule CRDs (monitoring.coreos.com/v1)
- etcd (metrics endpoint)
- kube-controller-manager / kube-scheduler / kube-proxy / kubelet metrics

## Sources Consulted
- Talos: Expose the Etcd Metrics Endpoint — https://www.talos.dev/v1.11/kubernetes-guides/configuration/etcd-metrics/
- Talos discussion: How to get etcd metrics — https://github.com/siderolabs/talos/discussions/7214
- kube-prometheus-stack values.yaml — https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus Operator API reference — https://prometheus-operator.dev/docs/api-reference/api/
- Grafana Alertmanager data source docs — https://grafana.com/docs/grafana/latest/datasources/alertmanager/
- Alertmanager configuration docs — https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
No technical issues found. All Helm chart value keys, Talos-specific port numbers (etcd 2381/HTTP, kube-controller-manager 10257/HTTPS, kube-scheduler 10259/HTTPS, kube-proxy 10249), Kubernetes API versions (monitoring.coreos.com/v1), service names/ports, and the Grafana alertmanager datasource `implementation: prometheus` field are accurate against current official documentation.

## Review Notes
- The Alertmanager routing example uses `match:` for route matching. This syntax is **deprecated** in favor of `matchers:` (a list of PromQL-style matcher strings), but it remains supported in current Alertmanager versions and continues to function. Future revisions could update the example to use `matchers:` for forward-compatibility.
- The kubelet section comment says "Talos exposes kubelet metrics on a different path", but the configuration actually only adds a metric-drop relabeling rule rather than overriding a path. The comment is slightly misleading but the configuration itself is valid; it does not affect correctness.
- `kubeProxy` is enabled in the example. Operators running Talos with Cilium's kube-proxy replacement (or any other proxy replacement) may not have kube-proxy running and should disable this block — this is environment-specific rather than a technical error in the post.
- Prerequisite "Kubernetes 1.25+" is a conservative floor; current Talos releases run much newer Kubernetes versions, so the floor remains valid.
