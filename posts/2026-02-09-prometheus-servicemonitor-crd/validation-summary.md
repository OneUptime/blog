# Validation Summary: How to Configure Prometheus ServiceMonitor CRD for Application Metrics Scraping

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus Operator
- Prometheus ServiceMonitor CRD
- Kubernetes Services and label selectors
- kube-prometheus-stack Helm chart behavior
- Prometheus HTTP API
- kubectl commands
- TLS and basic authentication for Prometheus scraping

## Sources Consulted
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator design documentation: https://prometheus-operator.dev/docs/getting-started/design/
- Prometheus Operator getting started guide: https://prometheus-operator.dev/docs/developer/getting-started/
- kube-prometheus-stack values.yaml: https://github.com/prometheus-community/helm-charts/blob/main/charts/kube-prometheus-stack/values.yaml
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/3.9/querying/api/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The Prometheus targets API example filtered `.labels.job == "web-app-monitor"`. In a ServiceMonitor, when `jobLabel` is not set, the Prometheus Operator defaults the `job` label to the selected Kubernetes Service name. I changed the filter to `.labels.job == "web-app"` so it matches the Service in the example.

## Review Notes
- The ServiceMonitor CRD fields used in the examples (`selector`, `endpoints`, `metricRelabelings`, `basicAuth`, `tlsConfig`, `params`, `honorLabels`, `honorTimestamps`, `namespaceSelector`) match the current Prometheus Operator API reference.
- The kube-prometheus-stack selector discussion is accurate for the chart defaults: the chart keeps `serviceMonitorSelectorNilUsesHelmValues` enabled by default and derives selectors from the Helm release values unless overridden.
- I could not run `kubectl --help` locally because `kubectl` is not installed in this workspace, so command validation was checked against Kubernetes documentation and stable CLI syntax.
