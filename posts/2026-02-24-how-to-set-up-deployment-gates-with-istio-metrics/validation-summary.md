# Validation Summary: How to Set Up Deployment Gates with Istio Metrics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio telemetry metrics
- Prometheus and PromQL
- Kubernetes and kubectl
- GitHub Actions
- Argo Rollouts AnalysisTemplates
- Bash, curl, Python, and bc

## Sources Consulted
- Istio Standard Metrics: https://istio.io/latest/docs/reference/config/metrics/
- Istio Telemetry API metrics reference: https://istio.io/latest/docs/reference/config/telemetry/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus query basics: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Prometheus query functions and histogram_quantile: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus histograms and summaries best practices: https://prometheus.io/docs/practices/histograms/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes JSONPath support: https://kubernetes.io/docs/reference/kubectl/jsonpath/
- GitHub Actions workflow syntax: https://docs.github.com/actions/learn-github-actions/workflow-syntax-for-github-actions
- Argo Rollouts Prometheus analysis provider: https://argoproj.github.io/argo-rollouts/analysis/prometheus/
- Argo Rollouts canary analysis documentation: https://argoproj.github.io/argo-rollouts/features/canary/
- Argo Rollouts analysis overview: https://argoproj.github.io/argo-rollouts/features/analysis/

## Issues Found
- The PromQL examples used `namespace="..."` to filter Istio request metrics. Istio's standard telemetry labels use `destination_workload_namespace` and `source_workload_namespace`, not a generic `namespace` label. I changed destination-side health, latency, traffic, dependency health, SLO, and Argo Rollouts queries to use `destination_workload_namespace`, and changed the dependency discovery query to use `source_workload_namespace`.
- The PromQL examples did not select a `reporter`, which can mix client-side and server-side Istio telemetry for the same request path. I added `reporter="destination"` for destination health gates and `reporter="source"` for dependency discovery so the queries match the intended measurement.
- The Argo Rollouts text described the `spec.strategy.canary.analysis` example as "pre-promotion analysis." In Argo Rollouts, that field configures background canary analysis. I changed the sentence to call it a background canary analysis.

## Review Notes
- The examples assume classic Prometheus histogram buckets for `istio_request_duration_milliseconds_bucket`, which matches the Prometheus export form of Istio's request duration metric.
- The shell snippets are technically valid examples, but production gates should also handle Prometheus API errors, empty vectors, `NaN`/`Inf` from zero traffic, authentication, and CI network access to the cluster Prometheus endpoint.
