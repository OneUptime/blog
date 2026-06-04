# Validation Summary: How to Use HPA with Pods Metrics for Scaling on Custom Pod Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes Horizontal Pod Autoscaler autoscaling/v2
- Kubernetes Custom Metrics API
- Prometheus Adapter
- Prometheus and PromQL
- Python Flask
- prometheus_client for Python
- kubectl

## Sources Consulted
- Kubernetes HorizontalPodAutoscaler autoscaling/v2 API reference: https://kubernetes.io/docs/reference/kubernetes-api/autoscaling/horizontal-pod-autoscaler-v2/
- Kubernetes Horizontal Pod Autoscaling concepts and algorithm documentation: https://kubernetes.io/docs/concepts/workloads/autoscaling/horizontal-pod-autoscale/
- Kubernetes Prometheus Adapter official repository and configuration guidance: https://github.com/kubernetes-sigs/prometheus-adapter
- Prometheus PromQL function documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus Python client instrumentation documentation: https://prometheus.github.io/client_python/instrumenting/
- Flask request context documentation: https://flask.palletsprojects.com/en/stable/reqcontext/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The Flask example used `request` without importing it. Added `request` to the Flask imports so the route hooks can access request data.
- The Flask example stored timing state on `request`. Changed this to use Flask's request-scoped `g` object, which is the documented context-local place for request-specific data used across handlers.
- The Prometheus Adapter request-rate rule used `rate(...)` directly. Because `http_requests_total` has `method`, `endpoint`, and `status` labels, this can return multiple series per pod. Changed the query to `sum(rate(...)) by (<<.GroupBy>>)` so the adapter returns one per-pod value for HPA.
- The latency HPA referenced `http_request_duration_p95_seconds`, but the adapter configuration did not expose that metric from the histogram exported by the application. Added a Prometheus Adapter rule using `histogram_quantile(0.95, sum(rate(..._bucket[2m])) by (<<.GroupBy>>, le))`.
- The connection-count explanation said the HPA prevents any single pod from being overwhelmed. Pods metrics are averaged across pods, so changed the wording to describe keeping the average connection count below target.
- The best-practices section said 2-minute Prometheus windows match typical HPA evaluation periods. Kubernetes documents the default HPA sync period as 15 seconds, so changed the wording to say the 2-minute window smooths values across several HPA syncs.

## Review Notes
- The YAML snippets parse successfully, and the HPA fields match the current autoscaling/v2 API shape.
- The Python snippet is syntactically valid after the import and request-state fixes.
- `kubectl` is not installed in the local environment, so command verification was performed against Kubernetes documentation rather than local `kubectl --help` output.
