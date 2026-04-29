# Validation Summary: How to Disable Metrics Server in K3s

## Status
validated

## Post Type
Guide

## Technologies Covered
- K3s
- Kubernetes
- Metrics Server
- Prometheus
- Prometheus Adapter
- Helm
- Horizontal Pod Autoscaler (HPA)

## Sources Consulted
- K3s configuration options: https://docs.k3s.io/installation/configuration
- K3s packaged components and `--disable`: https://docs.k3s.io/installation/packaged-components
- K3s server CLI reference: https://docs.k3s.io/cli/server
- Metrics Server project README: https://github.com/kubernetes-sigs/metrics-server
- Metrics Server Helm chart README: https://github.com/kubernetes-sigs/metrics-server/tree/master/charts/metrics-server
- Prometheus Adapter Helm chart README: https://github.com/prometheus-community/helm-charts/tree/main/charts/prometheus-adapter
- Prometheus Adapter configuration docs: https://github.com/kubernetes-sigs/prometheus-adapter/blob/master/docs/config.md
- kube-prometheus-stack Helm chart README: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- Kubernetes Horizontal Pod Autoscaler docs: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes HPA walkthrough: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale-walkthrough/

## Issues Found
- The existing-cluster disable example appended a list item directly to `config.yaml`, which is brittle and can produce invalid or misleading configuration. I replaced it with a supported K3s `config.yaml.d` drop-in example and noted that multi-server clusters must apply it on each server node.
- The post claimed Metrics Server consumes `~15MB RAM`, which was not supported by current upstream guidance. I removed the fixed number and replaced it with a non-numeric statement about small-node resource constraints.
- The production Metrics Server example used `--kubelet-certificate-authority=/var/lib/rancher/k3s/agent/server-ca.crt` without mounting that file into the container, so the command would not work as written. I replaced it with supported production hardening settings from the official chart and clarified that production should use trusted kubelet serving certificates instead of `--kubelet-insecure-tls`.
- The kube-prometheus-stack section implied the stack alone could cover Prometheus-backed autoscaling flows. I clarified that kube-prometheus-stack does not install Prometheus Adapter.
- The Prometheus Adapter section was technically incomplete. The original install/verify flow implied `external.metrics.k8s.io` would always be present, but the chart only creates that APIService when external rules are configured. I changed verification to match the configured APIs.
- The Prometheus Adapter configuration example showed a standalone ConfigMap that was not wired into the Helm chart install command. I replaced it with a chart values file example using `rules.custom` and `rules.resource`, which matches how the official chart consumes adapter configuration.
- The post later relied on `kubectl top` and CPU/memory HPA working through Prometheus Adapter, but the original example never configured `rules.resource`. I added the required resource metric rules and updated the HPA, `kubectl top`, comparison table, and conclusion text to state that resource metrics work only when `rules.resource` is configured.
- The kube-prometheus-stack persistent storage example omitted `accessModes`, which is commonly required for a PVC-backed `volumeClaimTemplate`. I added `ReadWriteOnce` to make the example complete.

## Review Notes
- The Grafana admin password example (`admin123`) is functional but not a good production default.
- The Prometheus Adapter example assumes Prometheus is reachable at `http://prometheus-operated.monitoring.svc.cluster.local:9090`; clusters with different release names, namespaces, or custom services may need to adjust that endpoint.
