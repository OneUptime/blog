# Validation Summary: How to Validate Calico Kube-Controllers Metrics in Production

## Status
validated

## Post Type
Guide

## Technologies Covered
- Calico kube-controllers
- Kubernetes
- Prometheus
- Prometheus Operator ServiceMonitor
- Prometheus Operator PrometheusRule
- Grafana
- Alertmanager

## Sources Consulted
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico documentation: Monitoring kube-controllers with Prometheus - https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico documentation: Kubernetes controllers configuration - https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Prometheus Operator API reference - https://prometheus-operator.dev/docs/api-reference/api/
- Prometheus Operator getting started guide - https://prometheus-operator.dev/docs/developer/getting-started/
- Tigera operator source for kube-controllers metrics Service - https://github.com/tigera/operator/blob/master/pkg/render/kubecontrollers/kube-controllers.go
- Tigera operator source for kube-controllers ServiceMonitor - https://github.com/tigera/operator/blob/master/pkg/render/monitor/monitor.go

## Issues Found
- The ServiceMonitor used `port: metrics`, but the Tigera operator-created `calico-kube-controllers-metrics` Service names its Prometheus port `metrics-port`. Updated the ServiceMonitor endpoint to `port: metrics-port` so Prometheus Operator can match the Service port.
- The description said metrics were collected from "all pods", but Calico kube-controllers is normally exposed through a kube-controllers metrics endpoint and the operator-created Service. Updated the wording to refer to the kube-controllers metrics endpoint.
- The introduction and conclusion described kube-controllers as the "policy distribution layer". Calico documentation describes kube-controllers as a set of controllers for control-plane functions, and its documented metrics include IPAM allocation metrics. Updated the wording to describe kube-controllers control-plane functions instead.

## Review Notes
The `up{job="calico-kube-controllers-metrics"} == 0` alert is appropriate when the selected Service is named `calico-kube-controllers-metrics`, because Prometheus Operator defaults the `job` label to the associated Service name when `jobLabel` is not set. Some Prometheus installations require extra labels on ServiceMonitor and PrometheusRule resources so the Prometheus instance selects them; that is deployment-specific and not a syntax issue in the post.
