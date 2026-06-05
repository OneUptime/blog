# Validation Summary: How to Use OpenTelemetry Metrics to Predict Infra Scaling Needs Before Traffic

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry Collector
- OpenTelemetry Collector transform processor
- OpenTelemetry Prometheus Remote Write exporter
- Prometheus / PromQL HTTP API
- Thanos / Cortex compatible remote write storage
- Prophet forecasting library
- Kubernetes CronJobs
- Kubernetes HorizontalPodAutoscaler v2
- Kubernetes Python client

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry Collector processor documentation: https://opentelemetry.io/docs/collector/components/processor/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Prometheus Remote Write exporter documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/prometheusremotewriteexporter/README.md
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus querying basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prophet quick start documentation: https://facebook.github.io/prophet/docs/quick_start.html
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes HorizontalPodAutoscaler v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Python client repository: https://github.com/kubernetes-client/python

## Issues Found
- The metrics snippet said the arrival-rate histogram captured inter-arrival times, but the instrument was defined as requests per second and was never recorded. I changed the comment to describe recording request rates and added a `record_arrival_rate` helper using the OpenTelemetry Python histogram `record` API.
- The metrics snippet said `day_of_week` and `hour` labels were included for pattern analysis, but the code did not add them. I added low-cardinality `day_of_week` and `hour` attributes derived from the current UTC timestamp.
- The request counter used a positional attributes argument. This is accepted by the Python API, but I changed it to the explicit `attributes=` keyword to match the current documented API signature and make the snippet clearer.
- The forecasting module hard-coded `PROMETHEUS_URL`, while the CronJob configured `PROMETHEUS_URL` as an environment variable. I changed the module to read `PROMETHEUS_URL` from the environment with the existing Thanos URL as the fallback.
- The prescaler snippet called `forecast_traffic` and `compute_required_replicas` without importing them, so it would fail with `NameError`. I added the import from the forecasting module.
- The CronJob set `RPS_PER_POD`, but the prescaler ignored it and always used the helper default. I added environment parsing and passed the value into `compute_required_replicas`.

## Review Notes
The corrected Python snippets were checked with `python3` AST parsing. I did not run the Kubernetes or OpenTelemetry Collector examples against a live cluster or collector binary in this workspace; configuration and API validation was performed by static review against official documentation.
