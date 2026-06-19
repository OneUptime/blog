# Validation Summary: How to Set Up Grafana for Kubernetes Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Grafana
- Prometheus
- kube-prometheus-stack Helm chart
- Helm 3
- kubectl
- PromQL
- kube-state-metrics
- node-exporter
- cAdvisor
- Kubernetes Ingress
- cert-manager

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress controllers documentation: https://kubernetes.io/docs/concepts/services-networking/ingress-controllers/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Helm install documentation: https://helm.sh/docs/helm/helm_install/
- Helm using Helm documentation: https://helm.sh/docs/intro/using_helm/
- prometheus-community kube-prometheus-stack chart: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack
- kube-prometheus-stack values.yaml: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Grafana Helm chart values.yaml: https://github.com/grafana/helm-charts/blob/main/charts/grafana/values.yaml
- Grafana Prometheus template variables documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/template-variables/
- Grafana Prometheus data source documentation: https://grafana.com/docs/grafana/latest/datasources/prometheus/
- kube-state-metrics deployment metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/deployment-metrics.md
- kube-state-metrics pod metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/pod-metrics.md
- cAdvisor Prometheus metrics documentation: https://github.com/google/cadvisor/blob/master/docs/storage/prometheus.md
- Grafana dashboard 315: https://grafana.com/grafana/dashboards/315-kubernetes-cluster-monitoring-via-prometheus/
- Grafana dashboard 6417: https://grafana.com/grafana/dashboards/6417-kubernetes-cluster-prometheus/
- Grafana dashboard 13332: https://grafana.com/grafana/dashboards/13332-kube-state-metrics-v2/

## Issues Found
- The prerequisites said Prometheus must already be deployed, but the guide installs kube-prometheus-stack, which deploys Prometheus as part of the chart. I changed this to note that a default StorageClass is needed if the Prometheus persistent volume should be provisioned automatically.
- The Ingress example used the older `kubernetes.io/ingress.class` annotation. Kubernetes documentation identifies `spec.ingressClassName` as the current field for selecting an IngressClass, so I changed the manifest to use `ingressClassName: nginx`.
- The community dashboard recommendations had inaccurate catalog metadata. Dashboard 6417 is "Kubernetes Cluster (Prometheus)", not "Kubernetes Pods", and the kube-state-metrics v2 dashboard found in Grafana's catalog is ID 13332, not 13770. I updated those entries.

## Review Notes
- The Helm chart values used for Grafana admin credentials, Prometheus retention/storage, Grafana persistence, and dashboard sidecar configuration match current kube-prometheus-stack/Grafana chart values.
- The `kubectl port-forward svc/prometheus-stack-grafana 3000:80 -n monitoring` command matches the current kubectl port-forward syntax for forwarding a Service.
- The kube-state-metrics metric names used in the PromQL examples are present in the current kube-state-metrics documentation. The cAdvisor `container_memory_working_set_bytes` metric is documented by cAdvisor.
- The deployment replica ratio query can produce awkward results for deployments intentionally scaled to zero replicas, but it is syntactically valid PromQL and reasonable for the tutorial scope.
