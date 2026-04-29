# Validation Summary: How to Monitor Serverless Workloads in Rancher - Workloads

## Status
validated

## Post Type
Tutorial / Guide — step-by-step configuration for monitoring serverless workloads (OpenFaaS, Knative, KEDA) on Rancher with Prometheus.

## Technologies Covered
- Rancher (Kubernetes distribution)
- OpenFaaS (function gateway, Prometheus metrics)
- Knative Serving (autoscaler metrics)
- KEDA (event-driven autoscaling)
- Prometheus / PromQL
- Prometheus Operator (ServiceMonitor CRD)
- kube-state-metrics

## Sources Consulted
- OpenFaaS gateway source: https://github.com/openfaas/faas (`gateway/metrics/metrics.go`, `gateway/main.go`) for metric names and default Prometheus port (8082).
- Knative Serving observability metrics: https://knative.dev/docs/serving/observability/metrics/serving-metrics/ and `pkg/autoscaler/scaling/metrics.go` / `pkg/reconciler/autoscaling/kpa/metrics.go` in https://github.com/knative/serving for the canonical autoscaler metric names.
- KEDA Prometheus integration: https://keda.sh/docs/latest/integrations/prometheus/ for current scaler metric names (post v2.16 deprecation of `keda_scaler_errors_total`).
- Prometheus Operator ServiceMonitor reference: https://prometheus-operator.dev/docs/operator/api/
- kube-state-metrics docs: https://github.com/kubernetes/kube-state-metrics/tree/main/docs for `kube_horizontalpodautoscaler_*` series.

## Issues Found

1. **OpenFaaS function-duration histogram name was wrong.**
   The post used `gateway_function_duration_seconds_sum` / `_count`. The actual histogram exposed by the OpenFaaS gateway is `gateway_functions_seconds` (note plural "functions", no "duration"). Fixed in the "Average function duration" PromQL example.

2. **Knative autoscaler metric names had an incorrect prefix.**
   The post used a `knative_serving_autoscaler_` prefix that does not exist in the metrics Prometheus actually scrapes. The real exposed names are unprefixed:
   - `knative_serving_autoscaler_desired_pods` -> `desired_pods`
   - `knative_serving_autoscaler_observed_stable_concurrency` -> `stable_request_concurrency`
   - `knative_serving_autoscaler_target_concurrency_per_pod` -> `target_concurrency_per_pod`
   - `knative_serving_autoscaler_not_ready_pod_count` -> `not_ready_pods`
   Fixed all four in Step 3.

3. **KEDA error metric was deprecated/removed.**
   `keda_scaler_errors_total` was removed in KEDA v2.16. Replaced with `keda_scaler_detail_errors_total`, the current per-scaler error counter.

4. **`FunctionAtMaxScale` PromQL was semantically broken.**
   The expression compared `kube_deployment_spec_replicas` to `kube_deployment_metadata_generation`. `metadata_generation` is the deployment's `metadata.generation` counter (incremented on every spec change), not the max-replica count, so the comparison would only fire by coincidence. Replaced with the correct HPA-based comparison using `kube_horizontalpodautoscaler_status_current_replicas` and `kube_horizontalpodautoscaler_spec_max_replicas`. Also updated the alert annotation label from `deployment` to `horizontalpodautoscaler` to match the new series.

## Review Notes
- Knative is gradually migrating from OpenCensus to OpenTelemetry semantic conventions (e.g. `kn.revision.pods.not_ready.count`). The unprefixed legacy names used in the post are still what current Prometheus scrapes see, but readers should be aware names may evolve in future Knative releases.
- For OpenFaaS specifically, function max-scale is configured via the `com.openfaas.scale.max` annotation on the function deployment and is enforced by the gateway, not necessarily by an HPA. The HPA-based alert added here works when the cluster also runs an HPA per function (a common Rancher / OpenFaaS Pro setup); operators relying purely on the gateway-managed scaler may need to surface the max-replica annotation via a custom recording rule instead.
- The ServiceMonitor in Step 1 uses `port: metrics`, which assumes the `gateway` Service has a named port `metrics`. The default OpenFaaS Helm chart names the Prometheus port `http-metrics` in some chart versions — readers should confirm the port name on their installed chart with `kubectl get svc -n openfaas gateway -o yaml`.
- The `Concurrent replicas` row in the Key Metrics table lists "At maxScale" as the alert threshold; this implicitly assumes per-function max-scale tracking, which the corrected Step 5 alert now wires up correctly.
