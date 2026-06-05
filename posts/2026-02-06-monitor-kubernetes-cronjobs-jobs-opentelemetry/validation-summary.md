# Validation Summary: How to Monitor Kubernetes CronJobs and Jobs with OpenTelemetry

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Python SDK
- OpenTelemetry Collector
- OpenTelemetry Collector Kubernetes Cluster Receiver
- OpenTelemetry Collector Kubernetes Events Receiver
- OpenTelemetry Collector Filter Processor
- OTLP/HTTP JSON metrics payloads
- Kubernetes Jobs and CronJobs
- Kubernetes RBAC
- Kubernetes downward API

## Sources Consulted
- OpenTelemetry Collector Kubernetes Cluster Receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/k8sclusterreceiver
- OpenTelemetry Collector Kubernetes Cluster Receiver generated metrics documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/k8sclusterreceiver/documentation.md
- OpenTelemetry Collector Kubernetes Events Receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/k8seventsreceiver
- OpenTelemetry Collector Filter Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Trace SDK specification: https://opentelemetry.io/docs/specs/otel/trace/sdk/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The Collector `filter/jobs` example used an include-style `logs.include.record_attributes` configuration that is not the current documented filter processor format. I changed it to `log_conditions` with an OTTL expression that drops events whose `k8s.event.reason` is missing or not in the Job-related allowlist.
- The shell wrapper comment said the OTLP payload sent both a completion counter and a duration gauge, but the payload only included the `job.completion` sum. I added a `job.duration` gauge with seconds as the unit.
- The CronJob downward API example used the legacy `job-name` label. I updated it to the current Kubernetes label key, `batch.kubernetes.io/job-name`.

## Review Notes
- The `k8s_cluster` receiver metric names listed in the post match the generated OpenTelemetry Collector receiver documentation, including `k8s.job.active_pods`, `k8s.job.desired_successful_pods`, `k8s.job.successful_pods`, `k8s.job.failed_pods`, and `k8s.cronjob.active_jobs`.
- The Python tracing example uses the documented OTLP gRPC exporter constructor pattern and correctly flushes/shuts down the trace provider for short-lived workloads.
- The Kubernetes Job and CronJob fields shown in the YAML snippets are current for `batch/v1`.
