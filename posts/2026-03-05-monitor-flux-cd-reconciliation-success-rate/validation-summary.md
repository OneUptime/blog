# Validation Summary: How to Monitor Flux CD Reconciliation Success Rate

## Status
validated

## Post Type
Tutorial / monitoring guide

## Technologies Covered
- Flux CD
- Kubernetes
- kube-state-metrics
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana

## Sources Consulted
- Flux Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/metrics/
- Flux custom Prometheus metrics documentation: https://fluxcd.io/flux/monitoring/custom-metrics/
- Flux CLI `flux get` reference: https://fluxcd.io/flux/cmd/flux_get/
- controller-runtime metrics package documentation: https://pkg.go.dev/sigs.k8s.io/controller-runtime/pkg/internal/controller/metrics
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus Operator API reference for PrometheusRule: https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/

## Issues Found
- The post used the older `gotk_reconcile_condition` readiness metric. Current Flux documentation describes Flux resource state metrics as kube-state-metrics custom resource metrics, with `gotk_resource_info` and labels such as `ready`, `exported_namespace`, and `customresource_kind`. Updated readiness queries, recording rules, alerts, dashboard examples, and the summary to use `gotk_resource_info`.
- The post described `gotk_reconcile_condition` as a metric exposed by Flux CD. Updated the wording to distinguish Flux controller metrics from kube-state-metrics resource state metrics.
- The per-namespace error count used `controller_runtime_reconcile_errors_total`, but controller-runtime documents that metric with a `controller` label, not a target resource namespace label. Changed it to a per-controller error count.
- The controller success-rate dashboard examples used Flux Deployment names such as `kustomize-controller` and `helm-controller` as `controller` label values. Updated them to controller-runtime-style controller names such as `kustomization`, `helmrelease`, and `gitrepository`.
- The alert named and commented as a high error rate was actually checking low success rate. Renamed it to `FluxControllerLowSuccessRate` and updated the comment.
- The no-reconciliation alert evaluated each `result` series separately. Aggregated by `controller` so the alert reflects total reconciliation activity per controller.

## Review Notes
PrometheusRule structure and Flux CLI commands are valid. `promtool` was not installed in the local environment, so PromQL was reviewed against Prometheus documentation and metric label documentation rather than linted with `promtool`.
