# Validation Summary: How to Configure Model Monitoring and Data Drift Detection

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- KServe InferenceService and Python runtime
- Prometheus and Prometheus Operator
- kube-prometheus-stack Helm chart
- Grafana dashboards
- Evidently AI
- Python, FastAPI, scikit-learn, prometheus-client
- Kubernetes Jobs for retraining

## Sources Consulted
- KServe custom predictor documentation: https://kserve.github.io/website/docs/model-serving/predictive-inference/frameworks/custom-predictor
- KServe Prometheus metrics documentation: https://kserve.github.io/archive/0.12/modelserving/observability/prometheus_metrics/
- KServe Python runtime SDK reference: https://kserve.github.io/website/docs/reference/python-runtime-sdk
- KServe PyPI release history: https://pypi.org/project/kserve/0.18.0/
- Prometheus Operator getting started and ServiceMonitor/PodMonitor docs: https://prometheus-operator.dev/docs/developer/getting-started/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/
- Evidently current Report and Data Drift documentation: https://docs.evidentlyai.com/docs/library/report and https://docs.evidentlyai.com/metrics/preset_data_drift
- Evidently data definition documentation: https://docs.evidentlyai.com/docs/library/data_definition
- Grafana dashboard HTTP API documentation: https://grafana.com/docs/grafana/latest/developers/http_api/dashboard/
- Prometheus query function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The demo `RandomForestClassifier` was never fitted, so `predict_proba()` would fail at runtime. I added a small synthetic training set and fitted the demo model during `load()`.
- The predictor exposed a separate metrics port `8000`, but the code did not start a metrics server on that port. I changed the example to use KServe's model server port `8080` and KServe Prometheus scraping annotations.
- The monitoring install only enabled arbitrary ServiceMonitor selection, while the corrected KServe scrape example uses a PodMonitor. I added the matching kube-prometheus-stack PodMonitor selector setting.
- The KServe monitor was written as a ServiceMonitor against a port that would not exist. I changed it to a PodMonitor that scrapes the pod's `http` port and explicitly selects the `ml-serving` namespace.
- The Dockerfile pinned old KServe and Prometheus client versions. I updated the pinned versions to current stable releases available as of the review date.
- The prediction logging helper was never called. I now call it before returning the prediction response.
- The drift detector used old Evidently imports and `report.as_dict()`. I updated it to the current `Report`, `Dataset`, and `DataDefinition` API and use the returned snapshot dictionary.
- The drift detector had no ingestion path, so it would never add samples or run drift checks. I added a small FastAPI `/predictions` endpoint and exposed it in the Kubernetes service.
- The drift detector metrics had no ServiceMonitor, so Prometheus would not scrape `model_drift_score` or `model_drift_detected` in a kube-prometheus-stack setup. I added a matching ServiceMonitor and service labels.
- Grafana panels used the deprecated `graph` panel type and a "Predictions Per Minute" query that returned per-second rate. I updated the panel type to `timeseries` and corrected the PromQL.
- The latency quantile PromQL did not aggregate histogram buckets by `le` and model labels. I updated the Grafana and alerting expressions to use `sum by (le, model_name, model_version)`.
- The PrometheusRule lacked the Helm release label commonly required by kube-prometheus-stack selectors. I added `release: monitoring`.
- The retraining controller used a Prometheus service DNS name that does not match the kube-prometheus-stack release name used in the post. I changed it to `monitoring-kube-prometheus-prometheus.monitoring.svc`.

## Review Notes
- The retraining controller example still assumes appropriate Kubernetes RBAC and a deployment manifest for the controller. That is deployment-specific and should be added before using it in production.
- The Evidently snapshot structure can vary by version, so the example now searches the returned snapshot dictionary for drift values instead of relying on a single fixed nested path.
