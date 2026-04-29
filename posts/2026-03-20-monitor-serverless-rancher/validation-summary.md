# Validation Summary: How to Monitor Serverless Workloads in Rancher

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Rancher (cattle-monitoring-system stack)
- Knative Serving (autoscaler, queue-proxy metrics, observability ConfigMap, tracing ConfigMap)
- OpenFaaS (gateway metrics via ServiceMonitor)
- KEDA (scaler error metrics)
- Prometheus (PrometheusRule, recording rules, alert rules, ServiceMonitor CRD from prometheus-operator)
- Grafana (dashboard JSON)
- Jaeger (Helm chart, Zipkin-compatible endpoint)
- Python (structured JSON logging)

## Sources Consulted
- Knative Serving observability docs (config-observability ConfigMap fields): https://knative.dev/docs/serving/observability/
- Knative metrics reference (revision_request_count, revision_request_latencies, autoscaler_desired_pods, autoscaler_actual_pods, label set with revision_name/namespace_name/response_code_class): https://knative.dev/docs/serving/observability/metrics/serving-metrics/
- Knative tracing configuration (config-tracing ConfigMap, zipkin backend, sample-rate): https://knative.dev/docs/serving/observability/tracing/
- Jaeger Helm chart documentation (jaegertracing/helm-charts, allInOne values): https://github.com/jaegertracing/helm-charts
- Jaeger Zipkin-compatible collector endpoint (/api/v2/spans on port 9411): https://www.jaegertracing.io/docs/latest/getting-started/
- OpenFaaS metrics docs (gateway /metrics, Prometheus scrape config): https://docs.openfaas.com/architecture/metrics/
- prometheus-operator CRDs (ServiceMonitor v1, PrometheusRule v1): https://prometheus-operator.dev/docs/operator/api/
- KEDA metrics (keda_scaler_errors_total): https://keda.sh/docs/latest/operate/prometheus/
- Rancher Monitoring (cattle-monitoring-system namespace for cluster-wide rules): https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/monitoring-v2-configuration-guides

## Issues Found
No technical issues found.

## Review Notes
- The Knative `revision_request_latencies` histogram is reported in milliseconds, so the `FunctionHighLatency` alert threshold of `2000` (2s) and the "P95 latency is {{ $value }}ms" annotation are consistent.
- The `knative:revision:latency_p95` recording rule groups by `(revision_name, le)` only, while `knative:revision:rps` groups by `(revision_name, namespace_name)`. This is a minor inconsistency — adding `namespace_name` to the latency rule would help disambiguate revisions with the same name across namespaces, but it is not technically incorrect.
- The Jaeger all-in-one Helm install explicitly disables `agent`, `collector`, and `query` because all-in-one bundles them into a single binary. This is the intended way to run all-in-one with the chart, though it is for development/demo only — production should use the production profile with persistent storage (Elasticsearch/Cassandra).
- `provisionDataStore.cassandra=false` is required when using `storage.type=memory` to prevent the chart from provisioning a Cassandra StatefulSet.
- The OpenFaaS ServiceMonitor uses `release: prometheus` label — readers should adjust this to match their kube-prometheus-stack release name (Rancher Monitoring uses `rancher-monitoring`, so `release: rancher-monitoring` would be more idiomatic in a stock Rancher install).
- Knative observability is being migrated toward OpenTelemetry; the `metrics.backend-destination` ConfigMap field still works but may be superseded in future Knative releases — readers on Knative 1.13+ should consult the latest observability docs.
