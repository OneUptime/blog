# Validation Summary: How to Set Stable `service.name` and `service.namespace` in Beyla

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Grafana Beyla 3.33.0
- OpenTelemetry resource attributes and semantic conventions
- Kubernetes Deployments, Pod annotations, and recommended labels
- Prometheus metrics
- Grafana Tempo traces
- YAML configuration

## Sources Consulted
- Grafana Beyla service discovery and service-identity precedence: https://grafana.com/docs/beyla/latest/configure/service-discovery/#override-service-name-and-namespace
- Grafana Beyla global service-name and namespace options: https://grafana.com/docs/beyla/latest/configure/options/#service-name-and-namespace
- Grafana Beyla Kubernetes decorator configuration: https://grafana.com/docs/beyla/latest/configure/metrics-traces-attributes/#kubernetes-decorator
- Grafana Beyla exported metric attributes: https://grafana.com/docs/beyla/latest/metrics/#attributes-of-beyla-metrics
- Grafana Beyla metrics and traces export configuration: https://grafana.com/docs/beyla/latest/configure/export-data/
- Grafana Beyla v3.33.0 default resource-label order and resolver source: https://github.com/grafana/beyla/blob/v3.33.0/vendor/go.opentelemetry.io/obi/pkg/kube/store.go#L72-L80
- Grafana Beyla v3.33.0 global `OTEL_SERVICE_NAME` mapping: https://github.com/grafana/beyla/blob/v3.33.0/pkg/beyla/config.go#L136-L144
- OpenTelemetry SDK environment-variable specification: https://opentelemetry.io/docs/specs/otel/configuration/sdk-environment-variables/
- OpenTelemetry Resource SDK specification: https://opentelemetry.io/docs/specs/otel/resource/sdk/
- OpenTelemetry service resource conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry deployment attributes: https://opentelemetry.io/docs/specs/semconv/registry/attributes/deployment/
- OpenTelemetry Kubernetes resource-attribute guidance: https://opentelemetry.io/docs/specs/semconv/non-normative/k8s-attributes/
- OpenTelemetry Operator resource-attribute configuration: https://opentelemetry.io/docs/platforms/kubernetes/operator/automatic/
- Kubernetes Deployment API reference: https://kubernetes.io/docs/reference/kubernetes-api/apps/deployment-v1/
- Kubernetes recommended labels: https://kubernetes.io/docs/concepts/overview/working-with-objects/common-labels/

## Issues Found
- The introduction treated `service.name` alone as sufficient to cause an identity collision. I clarified that OpenTelemetry service identity is the `service.namespace` and `service.name` pair and that sharing both makes unrelated applications appear as the same logical service.
- The precedence list did not distinguish explicit deprecated discovery overrides, combined two independently resolved attributes, omitted the Kubernetes-namespace fallback for `service.namespace`, and omitted `app.kubernetes.io/instance` from the current service-name label order. I scoped the automatic derivation correctly, made the per-attribute behavior explicit, added the namespace fallback, and documented Beyla v3.33.0's actual `app.kubernetes.io/instance` then `app.kubernetes.io/name` order.
- The post incorrectly said that `OTEL_SERVICE_NAME` on the Beyla DaemonSet only names Beyla. Beyla v3.33.0 still consumes that variable as its deprecated global `service_name` setting, which can assign one name to multiple matched processes. I replaced the statement with the appropriate warning.
- The post described process-level resources as universally highest precedence. Programmatically supplied OpenTelemetry SDK resources can have different precedence, so I scoped the statement to the environment variables' precedence in Beyla resource discovery.
- The SDK wording could imply that Beyla reads resources configured only in application code. Beyla discovers the shown values from the target process or container environment, so I clarified that the section concerns resource environment variables.
- The Deployment omitted `spec.replicas`, whose Kubernetes default is one, but the validation procedure required traffic to two replicas. I added `replicas: 2`.
- The validation heading referred to three signal paths although the checks cover Beyla's metrics and traces. I renamed the heading and clarified that the OTLP attribute `service.instance.id` appears as `instance` in Beyla's direct Prometheus output.
- The service-conventions link used an indirect anchor on the resource overview page. I changed it to the current service-specific OpenTelemetry conventions URL.

## Review Notes
- The post does not pin a Beyla version; this review used v3.33.0, the latest tagged release on 2026-08-30.
- All four YAML snippets parse successfully. The Deployment uses the current `apps/v1` API, has a selector matching its Pod-template labels, and now creates the two replicas required by the validation procedure.
- Grafana's current Beyla precedence prose omits `app.kubernetes.io/instance`, but the released v3.33.0 source and current OpenTelemetry Kubernetes guidance both place it before `app.kubernetes.io/name`; the post now reflects the released behavior.
- "OpenTelemetry Operator-style" describes the precedence model, not identical label mappings: Beyla additionally maps `app.kubernetes.io/part-of` to `service.namespace`, while current Operator guidance otherwise falls back to the Kubernetes namespace.
- The custom `resource_labels` example is valid and intentionally replaces the default service-name label list with its displayed order.
- `deployment.environment.name` is the current stable attribute; the older `deployment.environment` attribute is deprecated.
