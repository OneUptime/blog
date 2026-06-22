# Validation Summary: How to Configure Prometheus ServiceMonitor for Kubernetes

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Deployments, Services, Secrets, and kubectl
- Prometheus Operator CRDs: ServiceMonitor, PodMonitor, PrometheusRule
- kube-prometheus-stack Helm chart
- Prometheus scrape configuration, relabeling, and metric relabeling
- TLS and authentication for Prometheus scrape targets

## Sources Consulted
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack chart README: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/README.md
- Prometheus Operator ServiceMonitor CRD schema: https://github.com/prometheus-operator/prometheus-operator/blob/main/example/prometheus-operator-crd/monitoring.coreos.com_servicemonitors.yaml
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The architecture diagram incorrectly implied that Prometheus reads ServiceMonitor and PodMonitor resources directly. Updated it to show the Prometheus Operator generating scrape configuration from those resources and updating Prometheus.
- The Service manifest comment said `prometheus.io/scrape` was a label for the ServiceMonitor to select, but the ServiceMonitor selector in the example matches `app: my-app`. Updated the comment so it no longer implies the example selector uses that annotation-style label.
- The bearer token example used `bearerTokenSecret`, which is deprecated in current Prometheus Operator APIs. Replaced it with the supported `authorization.credentials` form.
- The PodMonitor use-case list said "Job metrics" without qualification. Adjusted it to "running Job pod metrics" because PodMonitor scrapes pods and finished Job pods are not generally active scrape targets.
- The Go application example implied Go apps generally tolerate frequent scrapes. Reworded it to make the shorter interval conditional on application capacity.
- The namespace selection section showed `namespaceSelector.matchLabels`, but Prometheus Operator `NamespaceSelector` supports only `any` and `matchNames`. Replaced that snippet with the documented default same-namespace selector behavior.

## Review Notes
The remaining examples are illustrative and assume matching Services, named Service ports, Prometheus selector settings, and exporters that expose the referenced metric names and labels. The kube-prometheus-stack Helm values shown are consistent with the chart documentation for allowing same-namespace ServiceMonitor and PodMonitor discovery without the Helm release label filter.
