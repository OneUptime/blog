# Validation Summary: How to Implement Canary Model Rollouts with KServe and Prometheus Metrics

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes
- KServe InferenceService
- KServe Python runtime SDK
- Prometheus and PromQL
- Prometheus Operator ServiceMonitor and PrometheusRule
- kube-prometheus-stack Helm chart
- Grafana dashboards
- Python, scikit-learn, and prometheus-client

## Sources Consulted
- KServe Canary Rollout Example: https://kserve.github.io/website/docs/model-serving/predictive-inference/rollout-strategies/canary-example
- KServe Canary Rollout Strategy: https://kserve.github.io/archive/0.13/modelserving/v1beta1/rollout/canary/
- KServe Prometheus Metrics: https://kserve.github.io/archive/0.12/modelserving/observability/prometheus_metrics/
- KServe Custom Predictor docs: https://kserve.github.io/website/docs/model-serving/predictive-inference/frameworks/custom-predictor
- KServe Python Runtime SDK API: https://kserve.github.io/website/docs/reference/python-runtime-sdk/python-runtime-sdk-api
- Prometheus histogram functions: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus histograms and summaries guide: https://prometheus.io/docs/practices/histograms/
- Prometheus Python client Histogram docs: https://prometheus.github.io/client_python/instrumenting/histogram/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- kube-prometheus-stack chart values/templates: https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack

## Issues Found
- The canary deployment used a top-level `spec.traffic` block with `revisionName` targets. KServe InferenceService canary rollout uses `spec.predictor.canaryTrafficPercent`; KServe automatically splits traffic between the latest ready revision and the last rolled-out revision. Updated the canary manifest and controller to use `canaryTrafficPercent`.
- The baseline manifest used `serving.kserve.io/revisionTag`, which is not the documented mechanism for the current KServe canary example. Replaced it with documented Prometheus scraping annotations.
- The KServe model server default HTTP port is `8080`, but the YAML exposed `8000`. Updated container ports and scraping configuration to use `8080`.
- The predictor created an unfitted `RandomForestClassifier`, so `predict_proba()` would fail. Added small demo training data in `load()` so the example can run as written.
- The predictor read the model version from a positional argument, while KServe model servers commonly use flags for server configuration. Switched to the `MODEL_VERSION` environment variable in code and manifests.
- Several PromQL histogram queries used invalid or incomplete forms. Updated latency queries to aggregate histogram buckets by `le`, and changed confidence averages to use the `_sum` and `_count` series exported by Prometheus histograms.
- The controller hardcoded a Prometheus service name that does not match the kube-prometheus-stack service naming pattern for a `monitoring` release. Updated it to `monitoring-kube-prometheus-prometheus` and made it respect environment variables.
- The controller patched full custom objects after fetching them, which risks clobbering server-managed fields. Replaced this with a focused custom-object patch body.
- The Grafana dashboard used invalid PromQL for `histogram_quantile(... ) by (model_version)` and queried a non-existent base histogram series for confidence. Updated both dashboard queries.

## Review Notes
The tutorial now matches KServe's documented serverless canary rollout model. Canary rollout support is documented for KServe serverless mode, so readers using raw deployment mode or other ingress setups should verify support in their installed KServe version and platform configuration.
