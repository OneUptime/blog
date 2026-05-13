# Validation Summary: How to Configure Flagger Canary Metrics with Custom Prometheus Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Flagger
- Kubernetes custom resources
- Prometheus and PromQL
- kubectl
- Canary deployments

## Sources Consulted
- Flagger Metrics Analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger Canary and MetricTemplate CRD schema: https://raw.githubusercontent.com/fluxcd/flagger/main/artifacts/flagger/crd.yaml
- Flagger v1beta1 API types: https://github.com/fluxcd/flagger/tree/main/pkg/apis/flagger/v1beta1
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The CPU usage example described the query as generic CPU usage. The PromQL expression uses `rate(container_cpu_usage_seconds_total[...]) * 100`, which represents CPU usage as a percentage of one CPU core, not as a percentage of CPU limits or node capacity. Updated the surrounding text to state that `max: 80` means 80% of one CPU core on average.

## Review Notes
- The Flagger `MetricTemplate`, `templateRef`, `thresholdRange`, `interval`, and `templateVariables` fields match the current Flagger v1beta1 CRD schema.
- The custom template variables shown in the post match Flagger's documented query template model.
- The Prometheus `histogram_quantile` example correctly preserves the `le` label while aggregating classic histogram buckets.
- The Prometheus API example is valid because `/api/v1/query` supports URL-encoded POST requests.
