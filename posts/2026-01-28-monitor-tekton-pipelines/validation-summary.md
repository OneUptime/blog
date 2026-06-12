# Validation Summary: How to Monitor Tekton Pipelines

## Status
validated

## Post Type
Guide

## Technologies Covered
- Tekton Pipelines
- Prometheus
- Grafana
- Kubernetes events
- kubectl

## Sources Consulted
- Tekton Pipelines documentation: Pipeline Controller Metrics - https://tekton.dev/docs/pipelines/metrics/
- Kubernetes documentation: kubectl get reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Kubernetes documentation: kubectl events reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_events/
- Kubernetes API reference: Event v1 - https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/

## Issues Found
- The post said to scrape the Tekton controller and webhook services for Prometheus metrics. Tekton's official Pipelines metrics documentation states that Pipeline controller metrics are available at `controller-service` on port `9090`, with Prometheus export enabled by default. I changed the sentence to direct Prometheus scraping to the Tekton controller service on port `9090`.

## Review Notes
- The `kubectl get events -n tekton-pipelines` command is valid because `kubectl get` can retrieve namespaced resources, and Events are Kubernetes resources. Current Kubernetes documentation also provides the newer `kubectl events` command for event-focused listing and filtering, but the command in the post remains correct.
- Several metrics named in the post are high-level dashboard goals rather than exact metric names. Tekton exposes PipelineRun and TaskRun counters and duration metrics with status labels, plus Knative workqueue metrics such as queue duration and depth, so the recommendations are directionally correct.
