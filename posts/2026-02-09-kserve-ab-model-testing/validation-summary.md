# Validation Summary: How to Implement A/B Model Testing with KServe Traffic Routing on Kubernetes

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- KServe InferenceService
- Knative Serving revisions and tag routing
- Prometheus and PromQL
- Grafana dashboards
- Python Prometheus client

## Sources Consulted
- KServe Canary Rollout Example: https://kserve.github.io/website/docs/model-serving/predictive-inference/rollout-strategies/canary-example
- KServe Control Plane API reference: https://kserve.github.io/website/docs/reference/crd-api
- KServe Inference Logger documentation: https://kserve.github.io/website/docs/model-serving/predictive-inference/logger
- KServe ServingRuntime documentation: https://kserve.github.io/website/docs/concepts/resources/servingruntime
- KServe Prometheus Metrics documentation: https://kserve.github.io/archive/0.12/modelserving/observability/prometheus_metrics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries documentation: https://prometheus.io/docs/practices/histograms/

## Issues Found
- The post used a top-level `spec.traffic` block with manually named revisions such as `recommendation-model-v1`. KServe InferenceService canary rollout uses `spec.predictor.canaryTrafficPercent`, and revisions are generated with names such as `recommendation-model-predictor-default-00001`. Updated the traffic split, rollout, rollback, and status examples accordingly.
- The post used `serving.kserve.io/revisionTag`, which is not the documented KServe tag-routing annotation. Replaced it with `serving.kserve.io/enable-tag-routing: "true"` and updated tagged access to use the status-provided `prev` and `latest` URLs.
- The post used the older direct `sklearn` predictor form. Updated examples to the current `model` predictor schema with `modelFormat.name: sklearn`.
- The verification loop expected a `.model_version` field in prediction responses. KServe predictive responses do not guarantee that field. Updated the example to send requests and confirm routing from logs or metrics instead.
- Several PromQL histogram expressions treated histograms like gauges or used invalid aggregation placement. Updated average and quantile queries to use `_sum`, `_count`, `_bucket`, `rate()`, and aggregation by `le` as documented by Prometheus.
- The automated rollout and rollback examples patched a non-existent `/spec/traffic` path and used invalid JSON-style quoting in one patch payload. Replaced them with merge patches for `spec.predictor.canaryTrafficPercent`.
- The Python metrics example queried error-rate data but only recorded successful predictions. Added a `status` parameter and only records latency/confidence histograms for successful predictions.

## Review Notes
- `kubectl` was not installed in the local environment, so CLI examples were reviewed against Kubernetes command semantics and official KServe examples rather than executed against a cluster.
- The ServiceMonitor snippet is structurally valid for Prometheus Operator setups, but production deployments still need a Service exposing the named `metrics` port and Prometheus configured to select the ServiceMonitor.
