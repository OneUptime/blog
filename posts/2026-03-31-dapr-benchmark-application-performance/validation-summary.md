# Validation Summary: How to Benchmark Dapr Application Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar model, service invocation API, state management API)
- Kubernetes (Deployments, namespaces, annotations)
- hey (HTTP load testing tool)
- wrk (HTTP benchmarking tool)
- Python Dapr SDK (`dapr-client`)
- GitHub Actions CI

## Sources Consulted
- Dapr service invocation API reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr state management API reference: https://docs.dapr.io/reference/api/state_api/
- Dapr sidecar annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/
- hashicorp/http-echo container image documentation: https://hub.docker.com/r/hashicorp/http-echo
- Kubernetes Deployment spec: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- hey HTTP load generator: https://github.com/rakyll/hey
- wrk HTTP benchmarking tool: https://github.com/wg/wrk

## Issues Found

1. **Missing required Deployment fields (`selector` and pod `labels`)**: The Kubernetes Deployment YAML was missing the required `spec.selector.matchLabels` field and corresponding `template.metadata.labels`. Without these, `kubectl apply` would reject the manifest with a validation error. Added `selector.matchLabels` and `template.metadata.labels` with `app: bench-target`.

2. **Incorrect default port for `hashicorp/http-echo`**: The `hashicorp/http-echo` image listens on port 5678 by default, not 8080. The post declared `containerPort: 8080` and `dapr.io/app-port: "8080"` but did not configure the container to listen on that port. Added `-listen=:8080` to the container args so the image binds to port 8080 as expected.

## Review Notes
- The `kubectl label namespace dapr-bench dapr.io/enabled=true` command adds a label to the namespace but has no functional effect on Dapr sidecar injection. Dapr injection is controlled by pod-level annotations (`dapr.io/enabled: "true"`), not namespace labels. The label is harmless but could be misleading to readers who think it enables Dapr for the namespace. Not changed since it's not technically incorrect — it just doesn't do what a reader might expect.
- The direct service benchmark URL (`http://bench-target.dapr-bench.svc:8080/`) assumes a Kubernetes Service exists for `bench-target`, but no Service manifest is shown in the post. Readers would need to create one separately. This is a completeness gap rather than an error.
- The performance overhead targets (P99 < 5ms for invocation, < 2ms for state, < 10ms for pub/sub) are reasonable engineering guidelines but are not official Dapr-published SLOs. They're presented appropriately as "typical targets."
- The Python benchmark script measures sequential write latency, which is appropriate for understanding per-operation overhead but won't capture throughput under concurrent load. This is fine for a basic benchmark tutorial.
