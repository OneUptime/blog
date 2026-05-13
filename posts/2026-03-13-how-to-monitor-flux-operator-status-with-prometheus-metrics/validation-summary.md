# Validation Summary: How to Monitor Flux Operator Status with Prometheus Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flux Operator
- Flux CD
- Prometheus
- Prometheus Operator ServiceMonitor and PrometheusRule
- Kubernetes
- Grafana
- controller-runtime metrics

## Sources Consulted
- Flux Operator Monitoring and Reporting documentation: https://fluxoperator.dev/docs/instance/monitoring/
- Flux Operator upstream manifests for Service and container port names: https://github.com/controlplaneio-fluxcd/flux-operator
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Kubebuilder/controller-runtime default metrics reference: https://book.kubebuilder.io/reference/metrics-reference.html
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/

## Issues Found
- The post referenced a non-existent `flux_instance_ready` metric. Updated examples, alert rules, Grafana queries, and verification queries to use the documented `flux_instance_info` metric with the `ready` label.
- The post used `namespace` and `version` labels for `flux_instance_info`. Updated these to documented labels such as `exported_namespace`, `ready`, and `revision`.
- The ServiceMonitor used `port: http-metrics`, but the Flux Operator Service exposes port 8080 under the Service port name `http`, while official Flux Operator docs use `targetPort: 8080`. Updated the ServiceMonitor and fallback Service example.
- The controller-runtime error examples used `controller_runtime_reconcile_total{result="error"}`. Updated error-rate examples to the documented `controller_runtime_reconcile_errors_total` metric.
- The latency alert used `histogram_quantile` directly over a rate without aggregating by `le`. Updated it to sum bucket rates by `le`.
- The Flux component examples used older Flux metrics (`gotk_reconcile_condition` and `gotk_suspend_status`). Updated the post to use current Flux Operator resource metrics via `flux_resource_info`.

## Review Notes
The Flux Operator Helm chart can create a ServiceMonitor directly with `serviceMonitor.create=true`, and the official documentation recommends a 30 second reporting interval when using operator-exported Prometheus metrics. The post now focuses on Flux Operator metrics; Flux controllers and kube-state-metrics can still be monitored separately when deeper Flux control-plane observability is needed.
