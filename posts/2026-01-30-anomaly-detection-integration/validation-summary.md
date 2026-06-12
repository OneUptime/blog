# Validation Summary: How to Implement Anomaly Detection Integration

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Python
- NumPy
- scikit-learn IsolationForest
- TensorFlow / Keras LSTM layers
- Prometheus and PromQL
- Prometheus Python client
- Alertmanager
- Docker Compose
- Kubernetes
- OneUptime incident management webhooks

## Sources Consulted
- Prometheus recording and alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus subquery support documentation: https://prometheus.io/blog/2019/01/28/subquery-support/
- Prometheus metric types documentation: https://prometheus.io/docs/concepts/metric_types/
- Prometheus Python client Gauge documentation: https://prometheus.github.io/client_python/instrumenting/gauge/
- Prometheus Python client HTTP exporter documentation: https://prometheus.github.io/client_python/exporting/http/
- scikit-learn IsolationForest API documentation: https://scikit-learn.org/stable/modules/generated/sklearn.ensemble.IsolationForest.html
- Keras LSTM layer documentation: https://keras.io/api/layers/recurrent_layers/lstm/
- Kubernetes liveness/readiness probe documentation: https://kubernetes.io/docs/tasks/configure-pod-container/configure-liveness-readiness-startup-probes/
- GitHub author profile: https://github.com/nawazdhandala
- Referenced OneUptime related-reading URLs in the post

## Issues Found
- The Prometheus exporter snippet referenced detector classes without importing them. Added imports for `ZScoreDetector`, `EMADetector`, and `SeasonalDetector`.
- The Prometheus exporter only extracted `z_score` or `anomaly_score`, so EMA and seasonal detectors could publish a zero anomaly score even when anomalous. Updated score extraction to handle `seasonal_z_score` and `deviation`.
- The IsolationForest result comment claimed the score was `-1 to 1`. scikit-learn documents `score_samples` as lower for more abnormal samples, and the inverted value is not a guaranteed 0-1 score. Updated the comment and normalization explanation.
- The LSTM autoencoder limitations said a GPU is required for training. Keras supports non-GPU execution, while GPU/cuDNN can improve performance when available. Changed this to "GPU recommended for larger training jobs."
- The PromQL examples calculated error rate with direct vector division. That can produce per-label ratios instead of the intended overall 5xx rate. Updated examples to use `sum(rate(5xx)) / sum(rate(total))`.
- The `histogram_quantile` examples did not aggregate histogram buckets by `le`, which is usually required for a service-level p99 from classic Prometheus histograms. Updated examples to use `sum by (le)`.
- The recording rule attempted to create an hour label with `{{ printf "%02d" (now | date "15") }}`. Prometheus recording rule labels are static label values, not Go templates. Replaced it with valid request-volume baseline/current recording rules.
- The Alertmanager examples used deprecated `match`, `source_match`, `target_match`, and `target_match_re` fields. Updated them to current `matchers`, `source_matchers`, and `target_matchers` syntax.
- The Kubernetes deployment used `/health` and `/ready` probes, but the shown Python exporter exposes metrics with `start_http_server`. Updated probes to use `/metrics`, which the Prometheus Python client HTTP server handles.

## Review Notes
- Python code fences parse successfully with Python `ast`.
- YAML code fences parse successfully with PyYAML.
- `promtool`, `amtool`, and scikit-learn were not installed locally, so Prometheus/Alertmanager and scikit-learn behavior was checked against official documentation rather than local command output.
