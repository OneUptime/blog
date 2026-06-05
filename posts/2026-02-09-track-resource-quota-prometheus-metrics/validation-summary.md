# Validation Summary: How to Track Kubernetes Resource Quota Usage with Prometheus Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ResourceQuota
- kube-state-metrics
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Grafana dashboards
- Kubernetes event exporting
- Alertmanager Slack notifications

## Sources Consulted
- Kubernetes Resource Quotas documentation: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes ResourceQuota API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/resource-quota-v1/
- Kubernetes Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes Kustomize documentation: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/kustomization/
- kube-state-metrics ResourceQuota metrics documentation: https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/policy/resourcequota-metrics.md
- kube-state-metrics standard example manifests: https://github.com/kubernetes/kube-state-metrics/tree/main/examples/standard
- Prometheus operators and vector matching documentation: https://prometheus.io/docs/prometheus/latest/querying/operators/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus Operator design/API documentation: https://prometheus-operator.dev/docs/getting-started/design/ and https://prometheus-operator.dev/docs/api-reference/api/
- Grafana time series visualization documentation: https://grafana.com/docs/grafana/latest/panels-visualizations/visualizations/time-series/
- Grafana dashboard JSON model documentation: https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/view-dashboard-json-model/
- caicloud Kubernetes event exporter README and deployment manifest: https://github.com/caicloud/event_exporter
- Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/

## Issues Found
- The kube-state-metrics install command used `kubectl apply -f` against a GitHub `tree/main` directory URL, which is not a Kubernetes manifest. Changed it to `kubectl apply -k` with a remote Kustomize Git URL for the official `examples/standard` directory.
- PromQL expressions divided or subtracted `kube_resourcequota{type="used"}` and `kube_resourcequota{type="hard"}` without vector matching. Because the `type` labels differ, those expressions would return no matching series. Added `ignoring(type)` to the affected ratio, alert, recording rule, remaining quota, storage, team, and production examples.
- The quota growth examples used `rate()` on `kube_resourcequota`, which is a gauge. Replaced it with `deriv()` and corrected the time-unit math for the "hours until quota exhausted" example.
- The Grafana panel JSON used the legacy `graph` panel and `yaxes` fields. Updated it to a current `timeseries` panel with `fieldConfig` standard options.
- The event exporter configuration used an unsupported Prometheus receiver shape and queried a non-matching `kubernetes_events` metric. Replaced it with the event exporter's published deployment command and corrected the query to use `kube_event_unique_events_total`.
- The quota event section implied a stable `ExceededQuota` event reason. Adjusted the wording and query because Kubernetes Events are best-effort and quota-related controller failures commonly surface as warning events such as `FailedCreate` or `FailedScheduling`.
- The exhausted-quota alert description said all new pods would be rejected. Narrowed it to pods or updates that would exceed the specific quota.

## Review Notes
- The remaining PromQL examples assume a single matching `hard` series for each `used` series after ignoring `type`. If additional scrape labels differ between the two sides in a specific environment, users may need more explicit `on(namespace, resourcequota, resource)` matching.
- Event exporter metrics are supplemental for quota troubleshooting; kube-state-metrics quota usage remains the primary reliable source for alerting on quota exhaustion.
