# Validation Summary: Copy Service and Pod Labels to Metrics with ServiceMonitor

## Status

validated

## Post Type

Technical tutorial / configuration guide

## Technologies Covered

- Kubernetes Services, Pods, labels, Endpoints, and EndpointSlices
- Prometheus Operator and the `ServiceMonitor` CRD
- Prometheus Kubernetes service discovery
- Prometheus target relabeling and `honor_labels`
- Prometheus time-series identity and cardinality
- PromQL
- `kubectl`

## Sources Consulted

- [Prometheus Operator `ServiceMonitorSpec` API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.ServiceMonitorSpec)
- [Prometheus Operator `RelabelConfig` API](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.RelabelConfig)
- [Prometheus Operator common Prometheus fields, including `overrideHonorLabels` and the default discovery role](https://prometheus-operator.dev/docs/api-reference/api/#monitoring.coreos.com/v1.CommonPrometheusFields)
- [Prometheus Operator ServiceMonitor type definitions at the reviewed commit](https://github.com/prometheus-operator/prometheus-operator/blob/1e00daf4e101cbbac959c36f343cc690f6a1aab0/pkg/apis/monitoring/v1/servicemonitor_types.go)
- [Prometheus Operator configuration generator at the reviewed commit](https://github.com/prometheus-operator/prometheus-operator/blob/1e00daf4e101cbbac959c36f343cc690f6a1aab0/pkg/prometheus/promcfg.go)
- [Prometheus configuration reference: `honor_labels`, Kubernetes discovery, and relabeling](https://prometheus.io/docs/prometheus/latest/configuration/configuration/)
- [Prometheus UTF-8 name support](https://prometheus.io/docs/guides/utf8/)
- [Prometheus data model](https://prometheus.io/docs/concepts/data_model/)
- [Prometheus metric and label naming guidance](https://prometheus.io/docs/practices/naming/)
- [Prometheus jobs and instances](https://prometheus.io/docs/concepts/jobs_instances/)
- [Prometheus conflict-resolution implementation at the reviewed commit](https://github.com/prometheus/prometheus/blob/ee1c94eb6f548967b58bdcbe6e9d9b28427b07bc/scrape/scrape.go#L645-L688) and [collision tests](https://github.com/prometheus/prometheus/blob/ee1c94eb6f548967b58bdcbe6e9d9b28427b07bc/scrape/scrape_test.go#L3295-L3356)
- [Kubernetes Services, including Services without selectors](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes EndpointSlices](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes EndpointSlice v1 API](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes label syntax and selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Kubernetes recommended labels](https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/)
- [`kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)

## Issues Found

- The post described `app.kubernetes.io/version` as an invalid Prometheus label name. Prometheus 3 accepts arbitrary UTF-8 label names, so that explanation was outdated. It now accurately states that Kubernetes discovery meta-label suffixes and the Prometheus Operator's generated target-label names apply underscore sanitization, producing `app_kubernetes_io_version` for this key.
- The post said a missing copied label is necessarily absent. The Operator's generated `regex: (.+)` copy rule instead does nothing for an absent or empty source; a destination set by an earlier rule can remain. The text now describes the rule as a no-op and correctly says there is no automatic cross-object fallback.
- The selectorless-Service discussion mentioned manually managed EndpointSlices without explaining that the Operator otherwise defaults to `Endpoints` discovery or that a slice must be associated with its Service. The post now directs readers to use `serviceDiscoveryRole: EndpointSlice` and the `kubernetes.io/service-name` association label.
- The post grouped application versions with bounded vocabularies even though version values normally grow with each release. The guidance now calls for stable or operationally controlled vocabularies and explicitly treats release-level version filtering as a deliberate growing-vocabulary tradeoff.
- The time-series identity explanation omitted the metric name and could imply that a target label duplicates samples. It now states that identity consists of the metric name plus the final label set, and distinguishes steady-state sample count from the new series identities and historical churn caused by adding or changing labels.
- The `honorLabels` explanation assumed that `exported_<name>` is always unused and did not make the per-sample behavior explicit. It now covers repeated `exported_` prefixes when needed, clarifies that `honorLabels: true` preserves the exporter's value on the conflicting sample, and points readers to Prometheus or PrometheusAgent `overrideHonorLabels` enforcement.
- The relabeling explanation was tightened to say that direct-copy destinations use the underscore-sanitized source key, discovery meta-labels exist through target relabeling and are removed afterward, and standard labels are produced jointly by the Operator and Prometheus only where applicable.

## Review Notes

- All seven YAML snippets parse successfully, and the Bash command block passes shell syntax validation. The complete Service manifest also passes `kubectl apply --dry-run=client --validate=false`; ServiceMonitor schema and field placement were checked against the current official CRD types and generator source.
- The Pod `metadata` snippet is intentionally illustrative rather than a complete Pod manifest. In a real workload, the Service's `targetPort: metrics` requires the selected Pod to expose a container port named `metrics`.
- Prometheus Operator still defaults ServiceMonitor discovery to the Kubernetes `Endpoints` role. Kubernetes deprecated the Endpoints API in v1.33; deployments migrating to EndpointSlice discovery also need appropriate EndpointSlice RBAC.
- The `up` query correctly verifies target labels. To verify `honorLabels` conflicts, query an exporter-provided metric too, because `up` is generated by Prometheus rather than scraped from the exporter.
