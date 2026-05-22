# Validation Summary: How to Estimate Istio Resource Requirements for Migration

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio
- Kubernetes
- Envoy sidecars
- IstioOperator configuration
- kubectl
- Prometheus and PromQL
- mTLS, access logging, and distributed tracing

## Sources Consulted
- Istio documentation: Installing the Sidecar - https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio documentation: Customizing the installation configuration - https://istio.io/latest/docs/setup/additional-setup/customize-installation/
- Istio documentation: Performance and Scalability - https://istio.io/latest/docs/ops/deployment/performance-and-scalability/
- Istio documentation: Resource Annotations - https://istio.io/latest/docs/reference/config/annotations/
- Istio documentation: Envoy Access Logs - https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio documentation: Distributed Tracing with Zipkin - https://istio.io/latest/docs/tasks/observability/distributed-tracing/zipkin/
- Istio 1.30 source chart defaults: istio-discovery values.yaml - https://raw.githubusercontent.com/istio/istio/release-1.30/manifests/charts/istio-control/istio-discovery/values.yaml
- Kubernetes documentation: Resource Management for Pods and Containers - https://kubernetes.io/docs/concepts/configuration/manage-resources-containers/
- Kubernetes kubectl reference - https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands

## Issues Found
- The post implied every pod in a cluster gets an Envoy sidecar. Updated the wording to clarify that this applies to injected workload pods in Istio sidecar mode.
- The istiod baseline memory examples were lower than Istio's current default request for a small pilot install. Updated the small, medium, and large examples, the IstioOperator snippet, and the planning spreadsheet to use memory requests that do not understate the current default.
- The sidecar default memory limit used `1Gi`; Istio's current values file expresses this as `1024Mi`. Updated the snippet to match the chart default exactly.
- The latency measurement command referenced `curl-format.txt` as if a local file would be available inside `kubectl exec`. Replaced it with an inline `curl -w` format string that runs inside the target pod.
- The bandwidth section conflated access logging with trace data sent to Zipkin or Jaeger and gave a fixed bytes-per-request estimate. Updated it to refer to distributed tracing and to estimate overhead from sampling rate and span size.

## Review Notes
The resource numbers are still planning starting points, not universal guarantees. Istio's official performance guidance emphasizes measuring with representative traffic because CPU, memory, and latency vary with request rate, payload size, connection count, worker threads, telemetry features, and mesh configuration size.
