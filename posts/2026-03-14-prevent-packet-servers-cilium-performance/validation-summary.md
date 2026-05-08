# Validation Summary: Preventing Packet Server Issues in Cilium Performance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes Deployments and Services
- kubectl
- Prometheus and Prometheus Operator
- kube-state-metrics
- Flux HelmRelease
- iperf3
- netperf

## Sources Consulted
- Cilium CLI `cilium status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_status/
- Cilium CLI `cilium config view` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_config_view.html
- Cilium performance and benchmark documentation: https://docs.cilium.io/en/stable/operations/performance/benchmark/
- Kubernetes `kubectl exec` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kube-state-metrics concept documentation: https://kubernetes.io/docs/concepts/cluster-administration/kube-state-metrics/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus Operator alerting and PrometheusRule documentation: https://prometheus-operator.dev/docs/developer/alerting/
- Flux HelmRelease documentation: https://fluxcd.io/flux/components/helm/helmreleases/

## Issues Found
- The PrometheusRule used `up{job="perf-test-server"} == 0`, but the iperf3 and netperf containers do not expose Prometheus metrics endpoints and the post did not define a scrape target with that job label. Changed the alert expression to use `kube_deployment_status_replicas_available` for the `perf-test-servers` Deployment, which is the appropriate Kubernetes object-state metric when kube-state-metrics is available.
- Several commands targeted `perf-server.monitoring` or `netperf-server.monitoring`, but the Service defined in the deployment snippet is named `perf-test-server`. Updated the iperf3 and netperf commands to use `perf-test-server.monitoring`.

## Review Notes
The Kubernetes Deployment, Service, PrometheusRule structure, `kubectl exec` command shape, `cilium status --verbose`, `cilium config view`, and Flux HelmRelease API version are consistent with current documentation. The monitoring alert assumes kube-state-metrics is installed and scraped by Prometheus, which is common in Prometheus-based Kubernetes monitoring stacks but should be treated as an operational prerequisite.
