# Validation Summary: `relabelings` vs `metricRelabelings` in ServiceMonitor: When Does Each Run?

## Status
validated

## Post Type
Technical guide / reference

## Technologies Covered

- Prometheus
- Prometheus Operator
- Kubernetes `ServiceMonitor` custom resources
- Kubernetes service discovery, Endpoints, and EndpointSlices
- Prometheus target and metric relabeling
- Prometheus scrape and label limits
- YAML
- `kubectl`

## Sources Consulted

- [Prometheus scrape configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#scrape_config)
- [Prometheus target relabeling configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#relabel_config)
- [Prometheus metric relabeling configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#metric_relabel_configs)
- [Prometheus Kubernetes service discovery configuration](https://prometheus.io/docs/prometheus/latest/configuration/configuration/#kubernetes_sd_config)
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/)
- [Prometheus relabel implementation and validation](https://github.com/prometheus/prometheus/blob/main/model/relabel/relabel.go)
- [Prometheus scrape implementation](https://github.com/prometheus/prometheus/blob/main/scrape/scrape.go)
- [Prometheus Operator Endpoint API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.Endpoint)
- [Prometheus Operator RelabelConfig API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.RelabelConfig)
- [Prometheus Operator ServiceMonitorSpec API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitorSpec)
- [Current Prometheus Operator ServiceMonitor CRD](https://github.com/prometheus-operator/prometheus-operator/blob/main/example/prometheus-operator-crd/monitoring.coreos.com_servicemonitors.yaml)
- [Prometheus Operator troubleshooting guide](https://prometheus-operator.dev/docs/platform/troubleshooting/#debugging-why-monitoring-resource-spec-changes-are-not-reconciled)
- [Kubernetes `kubectl explain` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_explain/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [Kubernetes field selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/)

## Issues Found

- The two examples intended to show rules in the wrong relabeling list omitted `action`. Because the default action is `replace`, which requires `targetLabel`, both examples were invalid and would be rejected instead of failing quietly. Added explicit `drop` actions and a nonempty `development` regex to the first rule so each is a valid rule that does not match the unavailable label.
- The target-label overview attributed `__address__`, `__scheme__`, and `__metrics_path__` to Kubernetes service discovery and implied that Pod metadata is always present. Clarified that Prometheus initializes the special scrape labels and that Pod metadata is attached when the discovered endpoint is backed by a Pod, with endpoint or EndpointSlice metadata depending on the active role.
- The opening description referred to samples from a “successful scrape,” even though metric relabeling and post-relabel limits run before final scrape success is known. Changed this to samples in the scrape response.
- The label-removal warning used the vague term “duplicate-series errors.” Replaced it with the current Prometheus behavior: duplicate-sample ingestion warnings and dropped conflicting samples when distinct samples collapse to the same final label set.
- The relabeling explanation incorrectly implied that all actions concatenate `sourceLabels`, match `regex`, and should explicitly set `targetLabel`. Clarified the behavior for `replace`, `keep`, and `drop`, and stated that fields are action-specific because label-oriented and equality actions use different field combinations.
- The validation advice stated that every target rule should change active or dropped target sets. Metadata-copy and request-rewrite rules do not necessarily change membership, so the advice and conclusion now distinguish target selection, target-label or scrape-URL changes, and metric sample or stored-series changes.

## Review Notes

- The core execution order, ServiceMonitor field names, generated Prometheus field names, Kubernetes discovery labels, automatic `up` exception, limit behavior, scrape metrics, YAML syntax, commands, and documentation links are correct after the edits.
- Prometheus currently marks `target_limit` as experimental.
- The Kubernetes Endpoints API is deprecated in Kubernetes 1.33 and later; EndpointSlice is recommended. The post already uses discovery-role-neutral wording and remains valid for either role.
- `scrape_samples_post_metric_relabeling` counts samples after metric relabeling, not guaranteed TSDB insertions; conflicting duplicates can still be dropped during ingestion.
- Unknown relabel action strings are rejected by the current ServiceMonitor CRD schema at API admission, so they may not produce an Operator rejection Event. Invalid persisted resources, such as rules containing an invalid regular expression, can be rejected by the Operator and reported through Events.
