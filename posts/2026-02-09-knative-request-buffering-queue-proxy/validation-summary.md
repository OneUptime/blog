# Validation Summary: How to Implement Request Buffering and Queue Proxy Tuning in Knative Serving

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Knative Serving
- Kubernetes
- Knative Pod Autoscaler
- Queue Proxy
- Activator
- Prometheus and OpenTelemetry metrics
- Node.js / Express
- Kubernetes probes and resource requests/limits

## Sources Consulted
- Knative Serving architecture: https://knative.dev/docs/serving/architecture/
- Knative concurrency configuration: https://knative.dev/docs/serving/autoscaling/concurrency/
- Knative autoscaling target configuration: https://knative.dev/docs/serving/autoscaling/autoscaling-targets/
- Knative autoscaling metric configuration: https://knative.dev/docs/serving/autoscaling/autoscaling-metrics/
- Knative target burst capacity: https://knative.dev/docs/serving/load-balancing/target-burst-capacity/
- Knative queue proxy resource requests and limits: https://knative.dev/docs/serving/services/configure-requests-limits-services/
- Knative Serving API reference: https://knative.dev/docs/serving/reference/serving-api/
- Knative Serving metrics reference: https://knative.dev/docs/serving/observability/metrics/serving-metrics/
- Knative metrics collection: https://knative.dev/docs/serving/observability/metrics/collecting-metrics/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Knative Serving source constants for queue sidecar annotations: https://github.com/knative/serving/blob/main/pkg/apis/serving/register.go
- Knative Serving queue proxy implementation: https://github.com/knative/serving/blob/main/pkg/queue/sharedmain/main.go

## Issues Found
- The first concurrency example had soft and hard limit comments reversed. Changed `autoscaling.knative.dev/target` to be described as the autoscaler soft target and `containerConcurrency` as the hard concurrency limit.
- The soft-vs-hard example incorrectly used `containerConcurrency` for the soft-limit service. Replaced it with `autoscaling.knative.dev/metric: "concurrency"` and `autoscaling.knative.dev/target`.
- Several queue proxy resource annotations used unsupported names such as `resourcePercentage`, `cpu-request`, and `memory-request`. Replaced them with the documented `queue.sidecar.serving.knative.dev/*-resource-request` and `*-resource-limit` annotations.
- Several snippets used unsupported queue proxy annotations such as `buffer-size`, `timeout`, `max-request-header-bytes`, `max-idle-conns`, and `max-idle-conns-per-host`. Replaced buffering examples with `autoscaling.knative.dev/target-burst-capacity`, and used `timeoutSeconds`, `responseStartTimeoutSeconds`, and `idleTimeoutSeconds` where request timeout behavior was needed.
- The monitoring examples used obsolete or unsupported metric names such as `queue_depth`, `queue_request_latencies_bucket`, and `queue_operations_per_second`. Updated them to current Knative/OpenTelemetry-style metrics and Prometheus-normalized names such as `kn_serving_queue_depth` and `kn_serving_invocation_duration_seconds_bucket`.
- The queue proxy metrics port-forward command targeted the Knative Service directly. Updated it to select a Knative Service pod and port-forward the pod's queue proxy metrics port.
- The advanced example used `MAX_CONCURRENT_REQUESTS` while the application example reads `MAX_CONCURRENT`. Updated the environment variable name for consistency.
- The best-practices and conclusion sections implied a configurable queue proxy buffer-size annotation. Reworded them to describe target burst capacity and the queue proxy's concurrency-derived pending queue.

## Review Notes
- All YAML configuration snippets parse successfully after the edits.
- The JavaScript example passes `node --check`.
- Metric names can vary depending on whether metrics are consumed as OTLP names or Prometheus-normalized names. The post now uses Prometheus-normalized names for PromQL examples and notes Knative's current OpenTelemetry-based metrics model through the selected metrics.
