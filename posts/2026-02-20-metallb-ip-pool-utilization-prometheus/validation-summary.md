# Validation Summary: How to Monitor MetalLB IP Pool Utilization with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- MetalLB
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule resources
- kube-state-metrics
- Grafana

## Sources Consulted
- MetalLB Prometheus metrics documentation: https://metallb.io/prometheus-metrics/
- MetalLB official Helm chart ServiceMonitor template and values: https://github.com/metallb/metallb/tree/main/charts/metallb
- Prometheus Operator API reference for ServiceMonitor and PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Kubernetes field selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- kube-state-metrics service metrics documentation/source: https://github.com/kubernetes/kube-state-metrics/tree/main/docs/metrics/service

## Issues Found
- The ServiceMonitor example selected labels and a `monitoring` port that do not match current MetalLB manifests. Current MetalLB metrics are exposed over HTTPS on the `metricshttps` port. Updated the example to create headless Services for the controller and speaker metrics endpoints and to scrape `metricshttps` with HTTPS TLS settings.
- The `MetalLBServicePending` alert used invalid PromQL: `kube_service_spec_type == "LoadBalancer"` compares a metric value to a string, and `kube_service_status_load_balancer_ingress == 0` does not reliably identify missing ingress entries. Replaced it with a valid `unless` query that selects LoadBalancer services without a load balancer ingress metric.
- The conclusion referenced a `predict_linear` alert that was not present in the post. Replaced that reference with the allocation rate panel already shown in the dashboard section.

## Review Notes
The pool utilization metrics and dashboard PromQL are consistent with MetalLB and Prometheus documentation. The ServiceMonitor and PrometheusRule resources require Prometheus Operator CRDs and matching Prometheus selectors in the target cluster.
