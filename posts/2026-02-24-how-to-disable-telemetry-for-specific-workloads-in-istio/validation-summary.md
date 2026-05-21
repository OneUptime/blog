# Validation Summary: How to Disable Telemetry for Specific Workloads in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio Telemetry API
- Istio standard metrics and Prometheus labels
- Istio access logging
- Istio distributed tracing
- Kubernetes kubectl commands
- Prometheus PromQL

## Sources Consulted
- Istio Telemetry API reference: https://istio.io/latest/docs/reference/config/telemetry/
- Istio Telemetry API task: https://istio.io/latest/docs/tasks/observability/telemetry/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes kubectl port-forward reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_port-forward/
- Kubernetes kubectl top reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/

## Issues Found
- The tracing examples used `randomSamplingPercentage: 0` and described that as disabling tracing. Istio documents that sampling only controls new sampling decisions and respects prior sampling decisions; it does not disable span reporting. Changed tracing-disabling examples to use `disableSpanReporting: true` and clarified that trace context propagation is not affected.
- The post said `default` plus no selector makes a Telemetry resource namespace-level. Istio makes the resource namespace-level because it has no selector; the name is only conventional. Updated the explanation and noted the single selector-less Telemetry resource limit per namespace.
- The client-side metrics section said every Istio metric is collected twice and disabling client-side metrics cuts volume in half. Istio standard traffic metrics can be reported from both client and server perspectives when both sides are in the mesh, but the original wording was too absolute. Updated the wording to be conditional.
- The health check example claimed to target endpoints, but the Telemetry resource selector targets workloads. Updated the heading and lead-in to describe a dedicated health check workload.
- The Prometheus impact query matched `source_workload` only, which can include metrics reported by other proxies for traffic involving that workload. Updated the query to count source-reported metrics for outbound traffic and destination-reported metrics for inbound traffic.

## Review Notes
The YAML examples are syntactically valid. `kubectl` was not installed in the review environment, so command syntax was checked against the official Kubernetes command reference instead of local `--help` output.
